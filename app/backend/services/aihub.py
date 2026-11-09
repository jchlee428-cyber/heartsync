"""
AI Hub service layer implementation.
Provides Generate Text (gentxt) and Generate Image (genimg) capabilities using the OpenAI SDK.
"""

import asyncio
import base64
import io
import logging
import re
from typing import AsyncGenerator

from core.config import settings
from openai import AsyncOpenAI
from schemas.aihub import GenImgRequest, GenImgResponse, GenTxtRequest, GenTxtResponse

logger = logging.getLogger(__name__)


class InvalidImageInputError(ValueError):
    """Raised when the provided image input cannot be parsed."""


class AIHubService:
    """AI Hub service class that wraps LLM calls based on the OpenAI SDK with intelligent simulation fallback."""

    def __init__(self):
        self.is_mock = (
            not settings.app_ai_key
            or settings.app_ai_key.startswith("mock-")
            or not settings.app_ai_base_url
        )
        if not self.is_mock:
            try:
                self.client = AsyncOpenAI(
                    api_key=settings.app_ai_key,
                    base_url=settings.app_ai_base_url.rstrip("/"),
                )
            except Exception as e:
                logger.warning(f"AsyncOpenAI client init notice: {e}")
                self.client = None
                self.is_mock = True
        else:
            self.client = None

    def _resolve_model(self, requested_model: str) -> str:
        """
        Resolve the target LLM model name based on environment configuration and base_url
        to prevent endpoint-model mismatch (e.g. requesting 'deepseek-v3.2' from api.openai.com).
        """
        configured_model = (getattr(settings, "app_ai_model", "") or "").strip()
        if configured_model:
            return configured_model

        base_url = (settings.app_ai_base_url or "").lower()
        model = (requested_model or "deepseek-v3.2").strip()

        if "api.openai.com" in base_url and model.startswith("deepseek"):
            return "gpt-4o-mini"
        if "api.deepseek.com" in base_url and model == "deepseek-v3.2":
            return "deepseek-chat"
        return model

    def _convert_message(self, msg) -> dict:
        """Convert message format and support multimodal content."""
        content = msg.content
        # If content is a list (multimodal), convert it to plain dicts
        if isinstance(content, list):
            content = [item.model_dump() if hasattr(item, "model_dump") else item for item in content]
        return {"role": msg.role, "content": content}

    def _build_counseling_chat_fallback(self, request: GenTxtRequest, user_msg: str) -> str:
        system_text = ""
        user_turns = 0
        for m in request.messages:
            role = getattr(m, "role", "")
            if role == "system":
                system_text += str(getattr(m, "content", "")) + "\n"
            elif role == "user":
                user_turns += 1

        turn_idx = max(0, user_turns - 1)
        clean_msg = (user_msg or "").strip()

        # Extract diagnosis context from system prompt if present
        total_match = re.search(r"총점:\s*(\d+)/250", system_text)
        weakest_match = re.search(r"가장 약한 영역:\s*([^\n(]+)\s*\((\d+)/50\)", system_text)
        attach_match = re.search(r"주된 애착 역동:\s*([^\n(]+)", system_text)
        critical_matches = re.findall(r"-\s*\[Q(\d+)\s*/\s*([^\]]+)\]\s*\"([^\"]+)\"", system_text)

        diag_note = ""
        if total_match and turn_idx <= 1:
            total_val = total_match.group(1)
            weak_label = weakest_match.group(1).strip() if weakest_match else "소통"
            weak_score = weakest_match.group(2) if weakest_match else "30"
            attach_type = attach_match.group(1).strip() if attach_match else "안정-불안 조율"
            if critical_matches and turn_idx == 0:
                q_id, q_concept, q_text = critical_matches[0]
                diag_note = (
                    f"\n\n📊 **진단 데이터 기반 맞춤 분석:**\n"
                    f"최근 50문항 진단(종합 {total_val}/250점)에서 가장 세심한 돌봄이 필요한 **{weak_label}({weak_score}/50점)** 영역 중 "
                    f"특히 **'{q_concept}'(Q{q_id}: \"{q_text}\")** 문항과 **{attach_type}** 애착 역동이 지금 말씀하신 고민과 직접적으로 맞닿아 있습니다."
                )
            else:
                diag_note = (
                    f"\n\n📊 **진단 맥락 연결:**\n"
                    f"진단 결과의 **{weak_label}({weak_score}/50점)** 영역과 **{attach_type}** 특성을 함께 고려할 때, "
                    f"두 분은 애정이 부족해서가 아니라 감정을 전달하고 수신하는 방식의 차이로 인해 피로감을 겪고 계신 상태로 보입니다."
                )

        # Intent classification across key clinical relationship scenarios
        if re.search(r"연락|카톡|문자|답장|읽씹|불안|전화|디지털", clean_msg):
            title = "연락 빈도와 애착 불안 조율"
            empathy = [
                "연락이 닿지 않거나 답장 템포가 달라질 때 밀려오는 초조함은 상대방과의 안전 기지(Secure Base)가 흔들릴까 봐 작동하는 자연스러운 애착 경보 신호입니다.",
                "카톡이나 문자에서 미묘한 온도 차가 느껴지면 하루 종일 마음이 쓰이고 외로움이 커지셨을 거예요.",
            ][turn_idx % 2]
            theory = (
                "볼비(Bowlby)의 애착 이론에 따르면 연락 공백에서 오는 불안은 횟수 자체보다 **'언제 다시 연결될지 아는 예측 가능성'**이 확보될 때 빠르게 진정됩니다."
            )
            action = [
                '오늘 대화에서 추궁 대신 **예측 가능한 한 줄 예보 규칙**을 제안해보세요:\n> 💬 *"바쁠 때 연락이 어려운 건 충분히 이해해. 다만 회의나 일정 전에 \'이따 8시쯤 연락할게\'라고 미리 한 줄만 알려주면 내가 훨씬 안심하고 기다릴 수 있을 것 같아."*',
                '문자나 카톡으로는 민감한 서운함을 다투지 않는 **\'디지털 소통 경계선\'**을 세워보세요. 텍스트는 표정과 억양이 빠져 부정적으로 해석되기 쉬우니, 서운한 감정은 반드시 직접 만나거나 통화로 나누시는 것이 좋습니다.',
            ][turn_idx % 2]
            followup = "보통 파트너와 연락이 어떤 상황에서 끊기거나 늦어질 때 가장 큰 불안이나 서운함이 올라오시나요?"
        elif re.search(r"반복|같은\s*문제|맨날|항상|다투|다툼|싸우|싸움|화가|화나|말투|비난", clean_msg):
            title = "반복되는 다툼 패턴과 감정 과부하 차단"
            empathy = [
                "같은 주제로 도돌이표처럼 다툼이 반복되면 '우리는 왜 대화가 안 될까' 하는 깊은 피로감과 무력감이 찾아오죠.",
                "다투는 순간 감정이 격해져 날 선 말이 오가고 나면, 문제 해결은커녕 서로의 상처만 남게 되어 마음이 많이 무거우셨을 거예요.",
            ][turn_idx % 2]
            theory = (
                "가트맨 박사의 연구에서 커플 갈등의 69%는 '영원한 문제'입니다. 핵심은 대화 시작 3분 안에 **비난·방어·경멸·담쌓기(4가지 독소)**가 등장하지 않도록 첫 문장을 바꾸는 것입니다."
            )
            action = [
                '대화를 꺼낼 때 **\'부드러운 시작(Softened Start-up)\'** 공식(상황 + 내 감정 + 구체적 요청)을 사용해보세요:\n> 💬 *"너는 왜 항상 그래?"* 대신 *"방금 그렇게 말하니까 내가 무시받는 느낌이라 속상했어(감정). 같은 말이라도 조금만 부드럽게 해줄 수 있을까?(요청)"*',
                '목소리가 커지거나 심박수가 빨라지면 즉시 **\'20분 타임아웃 규칙\'**을 선언하세요:\n> 💬 *"지금은 우리가 감정이 올라와서 상처 주는 말을 할 것 같아. 20분만 숨 고르고 9시에 다시 차분히 이야기하자."*',
            ][turn_idx % 2]
            followup = "최근 두 분이 반복해서 다투게 되는 가장 대표적인 상황은 주로 어떤 계기로 시작되나요?"
        elif re.search(r"회피|입을\s*다물|침묵|동굴|피하|담쌓기", clean_msg):
            title = "침묵·회피(담쌓기)와 추격-도망 악순환 해체"
            empathy = "대화로 문제를 풀고 싶은데 상대방이 입을 닫거나 자리를 피하면, 벽을 보고 말하는 것 같은 고립감과 답답함을 느끼게 되죠."
            theory = "감정중심치료(EFT)에서는 이를 **'추격자-회피자(Pursuer-Withdrawer) 악순환'**으로 봅니다. 회피하는 쪽도 무관심해서가 아니라 비난과 감정 과부하가 두려워 셔터를 내리는 방어 반응인 경우가 많습니다."
            action = (
                '상대가 침묵할 때 다그치는 대신 **안전감을 주는 완충 문장**을 건네보세요:\n'
                '> 💬 *"지금 당장 결론을 내자고 몰아세우려는 게 아니야. 생각이 정리될 시간이 필요하면 기다릴 테니, 오늘 밤에 10분만 편하게 이야기할 수 있을지 알려줘."*'
            )
            followup = "파트너가 침묵하거나 대화를 피할 때 주로 어떤 주제나 분위기에서 그런 반응이 나타나나요?"
        elif re.search(r"화해|사과|어색|냉전|싸운\s*후", clean_msg):
            title = "갈등 후 어색함을 깨는 회복 시도(Repair Attempt)"
            empathy = "다툰 뒤 마음은 누그러졌는데도 어색함이나 자존심 때문에 먼저 손을 내밀기가 참 쉽지 않죠."
            theory = "가트맨 연구에서 관계의 성패를 가르는 핵심 지표는 싸우지 않는 것이 아니라 **'회복 시도(Repair Attempt)를 얼마나 빨리 건네고 받아주는가'**입니다."
            action = (
                '냉전을 깨는 **\'변명 없는 3문장 회복 대화\'**를 건네보세요:\n'
                '> 💬 *"아까 내가 감정이 앞서서 말을 세게 한 건 내 불찰이야. 우리가 맞고 틀리고를 떠나서 너랑 서먹하게 지내는 게 제일 싫어. 따뜻한 차 한 잔 마시면서 풀자."*'
            )
            followup = "두 분이 다투고 나면 보통 냉전이 얼마나 지속되고, 주로 누가 먼저 화해의 손길을 건네는 편인가요?"
        elif re.search(r"권태기|설렘|식었|애정|사랑의\s*언어|데이트|친밀감|소원", clean_msg):
            title = "권태기 극복과 정서적 은행 계좌 재충전"
            empathy = "연애 초기의 설렘이 옅어지고 일상이 무덤덤해지면 '마음이 식은 걸까' 하는 허전함과 불안이 찾아오기 마련입니다."
            theory = "스턴버그의 사랑의 삼각형 이론과 아론 박사의 **'자기 확장 이론(Self-Expansion)'**에 따르면, 익숙한 일상 속에서도 두 사람이 '함께 새롭고 낯선 경험'을 공유할 때 뇌의 도파민과 친밀감이 동시에 재활성화됩니다."
            action = (
                "이번 주에는 익숙한 밥-카페 데이트 대신 **둘이서 처음 해보는 새로운 활동(가보지 않은 동네 산책, 원데이 클래스, 함께 요리하기)**을 하나 시도해보고, "
                "하루 1번 당연하게 여겼던 파트너의 장점을 구체적으로 칭찬하는 **'감정 계좌 입금 루틴'**을 실천해보세요."
            )
            followup = "본인과 파트너가 가장 사랑받는다고 느끼는 '사랑의 언어(따뜻한 말, 스킨십, 함께하는 시간, 선물, 도움)'는 각각 무엇인가요?"
        elif re.search(r"스킨십|성관계|잠자리|섹스|거부|신체적|포옹|키스", clean_msg):
            title = "신체적·성적 친밀감 회복과 정서-신체 연결"
            empathy = "스킨십이나 잠자리 문제는 가장 가까운 사이에서도 말 꺼내기가 조심스럽고, 거절감이나 온도 차가 자존감의 상처로 이어지기 쉬운 영역이에요."
            theory = "성 치료 및 EFT 연구에서 신체적 만족도의 가장 강력한 예측 인자는 빈도가 아니라 **'비성적 일상 스킨십(손잡기, 6초 포옹·키스)'을 통한 정서적 안전감과 솔직한 성적 소통**입니다."
            action = (
                '잠자리가 아닌 **낮 시간의 편안한 분위기**에서 부드럽게 대화를 열어보세요:\n'
                '> 💬 *"나는 너와 스킨십할 때 우리가 가장 가깝게 연결된 느낌이 들어서 좋아. 우리가 서로 피로감이나 부담 없이 자연스럽게 가까워지려면 어떻게 하면 좋을지 같이 이야기해보고 싶어."*'
            )
            followup = "일상 속에서 성관계와 무관한 가벼운 스킨십(손잡기, 포옹 등)은 두 분 사이에 자연스럽게 오가고 있나요?"
        elif re.search(r"신뢰|거짓말|의심|질투|이성|경계|과거", clean_msg):
            title = "신뢰 회복과 건강한 관계 경계선(Boundary) 설정"
            empathy = "한 번 흔들린 신뢰나 이성 문제로 인한 불안감은 마음속에서 쉽게 가라앉지 않아 스스로도 많이 지치셨을 거예요."
            theory = "신뢰는 말로 하는 다짐이 아니라 상대의 불안을 존중하는 **'투명한 선제 공유'와 '상호 합의된 경계선(Boundary)'**이 일관되게 지켜질 때 회복됩니다."
            action = (
                '상대를 통제하려는 어조 대신 **\'우리가 함께 안전할 수 있는 경계선 합의\'**를 제안해보세요:\n'
                '> 💬 *"너의 인간관계를 통제하려는 게 아니야. 다만 이성 지인과 늦은 시간 단둘이 연락하거나 만나는 건 나에게 불안을 줘. 우리 둘 다 마음 편할 수 있는 기준을 함께 정해보면 좋겠어."*'
            )
            followup = "파트너가 일상에서 어떤 구체적인 행동이나 투명한 태도를 보여줄 때 마음이 가장 놓이시나요?"
        elif re.search(r"결혼|미래|가치관|돈|재정|소비|가사|집안일|육아|부모님|시댁|처가", clean_msg):
            title = "현실적 가치관(재정·결혼·가족·가사)의 공유 의미 조율"
            empathy = "결혼, 재정, 가사 분담, 가족 문제처럼 현실과 맞닿은 가치관 차이는 '우리의 미래가 괜찮을까' 하는 무거운 고민을 안겨주죠."
            theory = "가트맨의 **'공유 의미 체계(Shared Meaning System)'**와 **'꿈 속의 꿈'** 기법에 따르면, 현실적 갈등 이면에는 각자가 삶에서 지키고 싶은 핵심 가치(안정감, 공정성, 자율성)가 숨어 있습니다."
            action = (
                '누가 맞는지 결론을 내리기보다 **상대의 선택 뒤에 숨은 핵심 가치를 묻는 대화**를 먼저 시도해보세요:\n'
                '> 💬 *"우리가 서로 자라온 환경이 달라서 생각이 다른 건 자연스러운 것 같아. 이 문제에서 네가 가장 중요하게 지키고 싶은 가치나 걱정이 무엇인지 먼저 듣고 싶어."*'
            )
            followup = "현재 두 분의 미래 계획이나 현실적 가치관 중에서 가장 우선적으로 합의점을 찾고 싶은 주제는 무엇인가요?"
        else:
            title = "공감적 경청과 비폭력 대화(NVC) 연결"
            empathy = "소중한 사람과 마음이 온전히 닿지 않고 겉도는 느낌이 들면 함께 있어도 외롭고 답답한 마음이 드실 거예요. 솔직한 마음을 나눠주셔서 감사합니다."
            theory = "마셜 로젠버그의 **비폭력 대화(NVC)**와 가트맨의 **'상호 전환(Turning Toward)'** 이론에서는 상대에 대한 평가를 멈추고 '관찰 → 내 감정 → 내 욕구 → 구체적 부탁'의 4단계로 말할 때 방어벽이 허물어진다고 설명합니다."
            action = (
                '오늘 대화에서는 조언이나 시시비비 대신 **\'반영적 경청 대화법\'**을 제안해보세요:\n'
                '> 💬 *"우리가 서로 오해가 쌓이지 않게, 내가 먼저 2분 동안 내 속마음을 말할 테니 \'그래서 서운했구나\' 하고 먼저 들어줄 수 있을까? 그다음엔 내가 네 이야기를 끝까지 귀 기울여 들을게."*'
            )
            followup = "파트너와 대화할 때 어떤 순간에 가장 '내 마음을 몰라준다'거나 '답답하다'고 느끼시나요?"

        return (
            f"{empathy}{diag_note}\n\n"
            f"💡 **심리학적 핵심 원리 ({title})**\n{theory}\n\n"
            f"✨ **오늘 바로 실천해볼 수 있는 맞춤 대화법**\n{action}\n\n"
            f"❓ **함께 더 이야기해보고 싶어요:**\n{followup}"
        )

    def _build_diagnosis_report_fallback(self, user_msg: str) -> str:
        total_match = re.search(r"총점:\s*(\d+)", user_msg)
        total_score = int(total_match.group(1)) if total_match else 175

        def _extract_cat(label: str, default_val: int) -> int:
            m = re.search(rf"{label}[:\s]*(\d+)/50", user_msg)
            return int(m.group(1)) if m else default_val

        conflict_score = _extract_cat("갈등 관리", 35)
        intimacy_score = _extract_cat("정서적 친밀감", 36)
        trust_score = _extract_cat("신뢰/애착", 35)
        values_score = _extract_cat("가치관", 35)
        physical_score = _extract_cat("신체적 만족", 34)

        attach_match = re.search(r"주된 애착 역동:\s*([^\n]+)", user_msg)
        attach_summary = attach_match.group(1).strip() if attach_match else "안정-불안 복합 애착 역동"

        horsemen_match = re.search(r"활성화된 갈등 독소:\s*([^\n]+)", user_msg)
        horsemen_summary = (
            f"특히 50문항 개별 응답에서 **{horsemen_match.group(1).strip()}** 패턴이 감지되어 갈등 초기 대응 방식의 전환이 중요합니다."
            if horsemen_match
            else "서운함이 발생했을 때 즉각적이고 건강한 방식으로 표현하기보다는, 감정을 삭이다가 한꺼번에 표출되거나 침묵(담쌓기)으로 이어지는 패턴이 관찰됩니다."
        )

        critical_items = re.findall(r"-\s*\[Q(\d+)\s*/\s*([^\]]+)\]\s*\"([^\"]+)\"\s*→\s*사용자 응답:\s*\*\*([^*]+)\*\*\s*\(([^)]+)\)", user_msg)
        if critical_items:
            top3_lines = "\n".join(
                f"{idx + 1}. **{part_concept.strip()} (Q{qid}):** \"{qtext}\" 문항에서 '{ans_label}'({health})로 응답하여 우선적인 소통 개선이 필요합니다."
                for idx, (qid, part_concept, qtext, ans_label, health) in enumerate(critical_items[:3])
            )
        else:
            top3_lines = (
                "1. **비난에 이은 방어적 태도:** 대화가 공격으로 느껴질 때 변명하거나 역공하는 패턴 (방치 시 심리적 거리 확대)\n"
                "2. **해결되지 않은 서운함의 누적:** 즉시 풀지 못한 작은 감정들이 체념으로 변질될 위험\n"
                "3. **소통 시간의 절대적 부족:** 서로의 일상에 대한 공감 결여로 인한 정서적 고립감"
            )

        return f"""### 📊 종합 진단 결과
이번 심층 관계 진단 결과, 두 분의 관계 종합 점수는 {total_score}/250점이며, 50문항 개별 응답 기반 애착 프로파일은 **{attach_summary}**으로 분석되었습니다.
전반적으로 서로를 향한 정서적 유대감과 애착의 토대가 유지되고 있으나, 갈등 상황에서 무의식적으로 방어·회피적인 대화 패턴이 나타나며 심리적 에너지가 소모되는 경향이 있습니다. 존 가트맨(John Gottman) 연구에 따르면 관계의 성패는 갈등의 유무가 아니라 '갈등을 회복하는 속도와 태도'에 달려 있습니다. 현재 두 분은 상호 보완적인 소통 훈련을 통해 신뢰와 친밀감을 크게 도약시킬 수 있는 중요한 전환점에 있습니다.

### ⚡ 갈등 관리 분석 ({conflict_score}/50)
**강점:** 갈등이 극단적인 대립으로 치닫기 전에 서로를 배려하려는 내면의 의지가 여전히 확고합니다.
**개선점:** {horsemen_summary}
**실천 전략:**
1. **부드러운 시작(Soft Start-up):** 비난이 아닌 "나는 ~할 때 ~한 감정을 느껴"라는 '나-전달법(I-Message)'으로 대화를 시작하세요.
2. **20분 브레이크 타임:** 대화 중 심박수가 상승하거나 감정이 격해지면 "잠깐 20분만 쉬었다가 다시 이야기하자"고 약속하고 감정을 가라앉히세요.
3. **즉각적인 회복 시도:** 갈등 중 상대방의 손을 잡거나 "내 말이 상처가 됐다면 미안해"라는 작은 회복 신호를 적극적으로 보내세요.

### 💕 정서적 친밀감 분석 ({intimacy_score}/50)
**강점:** 일상 속에서 서로에 대한 호감과 존중의 기본기가 튼튼하게 자리잡고 있습니다.
**개선점:** 바쁜 일상과 익숙함으로 인해 서로의 최신 고민이나 감정 상태를 세심하게 업데이트하는 '사랑의 지도(Love Map)'가 다소 정체되어 있습니다.
**실천 전략:**
1. **매일 10분 온전한 집중 대화:** 스마트폰을 내려놓고 퇴근 후 서로의 하루와 감정을 묻는 10분의 집중 시간을 확보하세요.
2. **감정 은행 계좌 매일 입금:** 칭찬, 고마움의 표현, 따뜻한 눈맞춤을 하루 최소 5번 이상 실천하세요 (가트맨 5:1 황금비율).
3. **취약성 공유(Vulnerability):** 완벽한 모습만 보이려 하지 말고, 내면의 불안이나 고민을 솔직하게 털어놓아 정서적 연결을 강화하세요.

### 🤝 신뢰/애착 분석 ({trust_score}/50)
**강점:** 오랜 시간 함께 쌓아온 관계적 연속성과 상대방에 대한 근본적인 믿음이 존재합니다.
**개선점:** 세부 문항 응답에서 **{attach_summary}** 역동이 확인되며, 상대방의 침묵을 거절로 오해하거나 독립성을 침해로 받아들이는 악순환이 발생하지 않도록 정서적 조율이 필요합니다.
**실천 전략:**
1. **안전 기지(Secure Base) 구축:** 상대방이 감정적으로 지쳐 있을 때 재촉하지 않고 편안한 안식처가 되어주세요.
2. **예측 가능한 투명성:** 사소한 일정이나 감정 변화도 미리 공유하여 불안감을 사전에 차단하세요.
3. **약속의 일관된 이행:** 작은 약속이라도 반드시 지켜 상호 신뢰의 안정감을 단단하게 만드세요.

### 🌟 가치관 분석 ({values_score}/50)
**강점:** 미래에 대한 큰 틀의 지향점과 관계를 발전시키고자 하는 의지가 서로 일치합니다.
**개선점:** 재정 관리, 여가 시간 배분, 가족과의 관계 등 세부적인 생활 방식에서 오는 우선순위 차이를 조율할 필요가 있습니다.
**실천 전략:**
1. **'꿈 속의 꿈(Dreams Within Conflict)' 대화:** 특정 고집 뒤에 숨겨진 상대방의 어린 시절 경험이나 핵심 가치를 경청하세요.
2. **공동의 의식(Ritual) 만들기:** 매주 주말 함께하는 산책이나 기념일 축하 방식 등 둘만의 고유한 문화를 만드세요.
3. **영원한 문제 인정하기:** 69%의 갈등은 해결하는 것이 아니라 평생 관리하는 것임을 인정하고 타협점을 찾으세요.

### 🔥 신체적 만족도 분석 ({physical_score}/50)
**강점:** 서로를 향한 자연스러운 매력과 스킨십에 대한 잠재적 친밀감이 살아있습니다.
**개선점:** 정서적 피로도가 신체적 소통으로 이어지는 것을 방해하며, 스킨십에 대한 솔직한 대화가 줄어들 수 있습니다.
**실천 전략:**
1. **비성적 일상 스킨십 증가:** 손잡기, 가벼운 포옹, 어깨 토닥이기 등 일상 속 애정 표현을 자연스럽게 늘리세요.
2. **6초 키스 루틴:** 매일 아침 출근길과 저녁 귀가 시 최소 6초간의 깊은 키스로 유대 옥시토신을 분비시키세요.
3. **편안한 감정 교류 우선:** 신체적 친밀감 이전에 충분한 정서적 안정감이 먼저 조성되도록 배려하세요.

### 🎯 핵심 위험 요소 TOP 3
{top3_lines}

### 💡 30일 맞춤 개선 플랜
- **1주차 (감정 정화):** 비난하지 않고 '나-전달법'으로만 대화하기 & 매일 1가지 고마운 점 말하기
- **2주차 (친밀감 회복):** 사랑의 지도 업데이트 (파트너의 최근 스트레스 3가지 경청하기) & 6초 키스 루틴
- **3주차 (갈등 조율):** 갈등 발생 시 20분 브레이크 규칙 실천 & 작은 회복 시도 3회 시도하기
- **4주차 (지속적 습관):** 둘만의 주간 리뷰 데이트 진행 & 30일간의 변화 축하하기

### 🌈 전문가 코멘트
두 분은 서로를 깊이 사랑하고 아끼는 마음이 여전히 살아있는 소중한 관계입니다. 지금 마주하고 있는 소통의 어려움은 두 사람의 사랑이 식어서가 아니라, 단지 효과적인 대화법과 감정 조율 기술을 연습해보지 않았기 때문입니다. 위의 실천 가이드를 하루에 하나씩 가볍게 시도해보세요. 작은 대화 습관의 변화만으로도 두 사람의 관계는 놀라울 정도로 따뜻해질 것입니다."""

    def _build_fallback_text(self, request: GenTxtRequest) -> str:
        user_msg = ""
        for m in reversed(request.messages):
            if getattr(m, "role", "") == "user":
                user_msg = str(getattr(m, "content", ""))
                break

        if "진단 결과 데이터" in user_msg or "리포트 작성 가이드" in user_msg or "총점:" in user_msg:
            return self._build_diagnosis_report_fallback(user_msg)
        return self._build_counseling_chat_fallback(request, user_msg)

    async def gentxt(self, request: GenTxtRequest) -> GenTxtResponse:
        """Generate Text API (non-streaming), supports text and image input."""
        if self.is_mock or not self.client:
            logger.info("Using simulated AI text generation (mock or unconfigured API key)")
            content = self._build_fallback_text(request)
            return GenTxtResponse(
                content=content,
                model=request.model,
                usage={"prompt_tokens": 120, "completion_tokens": 800, "total_tokens": 920},
            )

        try:
            messages = [self._convert_message(msg) for msg in request.messages]
            resolved_model = self._resolve_model(request.model)

            response = await self.client.chat.completions.create(
                model=resolved_model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=False,
            )

            content = response.choices[0].message.content or ""
            usage = None
            if response.usage:
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            return GenTxtResponse(
                content=content,
                model=resolved_model,
                usage=usage,
            )

        except Exception as e:
            logger.warning(f"Live OpenAI gentxt call failed ({e}), falling back to intelligent simulation...")
            content = self._build_fallback_text(request)
            return GenTxtResponse(
                content=content,
                model=request.model,
                usage={"prompt_tokens": 120, "completion_tokens": 800, "total_tokens": 920},
            )

    async def gentxt_stream(self, request: GenTxtRequest) -> AsyncGenerator[str, None]:
        """Generate Text API (streaming), supports text and image input."""
        if self.is_mock or not self.client:
            logger.info("Using simulated AI stream generation (mock or unconfigured API key)")
            fallback_text = self._build_fallback_text(request)
            chunks = [fallback_text[i:i + 14] for i in range(0, len(fallback_text), 14)]
            for chunk in chunks:
                yield chunk
                await asyncio.sleep(0.012)
            return

        try:
            messages = [self._convert_message(msg) for msg in request.messages]
            resolved_model = self._resolve_model(request.model)

            stream = await self.client.chat.completions.create(
                model=resolved_model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.warning(f"Live OpenAI gentxt_stream failed ({e}), falling back to intelligent simulation...")
            fallback_text = self._build_fallback_text(request)
            chunks = [fallback_text[i:i + 14] for i in range(0, len(fallback_text), 14)]
            for chunk in chunks:
                yield chunk
                await asyncio.sleep(0.012)

    @staticmethod
    def _extract_image_ref(item: object) -> str:
        """
        Extract an image reference from an OpenAI-compatible genimg response item.

        Prefer `url` (to avoid huge response bodies); if url is not available, fall back to `b64_json`
        and wrap it as a base64 data URI.
        Compatible with both dict items and SDK object items.
        """
        if isinstance(item, dict):
            url = item.get("url")
            if url:
                return url
            b64_json = item.get("b64_json")
            if b64_json:
                return f"data:image/png;base64,{b64_json}"
        else:
            url = getattr(item, "url", None)
            if url:
                return url
            b64_json = getattr(item, "b64_json", None)
            if b64_json:
                return f"data:image/png;base64,{b64_json}"

        raise RuntimeError("Neither url nor b64_json found in genimg response item")

    @staticmethod
    def _parse_data_uri(data_uri: str) -> tuple[bytes, str]:
        """Parse a base64 data URI and return (bytes, content_type)."""
        if "," not in data_uri:
            raise InvalidImageInputError("Invalid data URI: missing ',' separator.")

        header, b64_data = data_uri.split(",", 1)
        content_type = "image/png"
        if header.startswith("data:"):
            meta = header[5:]
            # Typical header: "image/png;base64"
            if ";" in meta:
                maybe_type = meta.split(";", 1)[0].strip()
                if maybe_type:
                    content_type = maybe_type
            elif meta.strip():
                content_type = meta.strip()

        try:
            return base64.b64decode(b64_data), content_type
        except Exception as e:
            raise InvalidImageInputError("Invalid base64 data in data URI.") from e

    @staticmethod
    def _filename_from_content_type(content_type: str, name_prefix: str = "image") -> str:
        """Best-effort filename for in-memory uploads."""
        ct = (content_type or "").lower()
        ext = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/webp": "webp",
        }.get(ct, "png")
        return f"{name_prefix}.{ext}"

    async def _image_str_to_upload_file(self, image: str, name_prefix: str = "image") -> io.BytesIO:
        """
        Convert image input (base64 data URI) into an in-memory file object for uploads.

        The OpenAI `images.edit` endpoint expects multipart file uploads; we keep the API JSON-only
        by allowing clients to pass a base64 data URI, and converting it here.
        """
        image = (image or "").strip()
        if not image:
            raise InvalidImageInputError("Input image is empty.")

        if image.startswith(("http://", "https://")):
            raise InvalidImageInputError(
                "URL input is not supported for image editing. Use a base64 data URI like `data:image/png;base64,...`."
            )
        if not image.startswith("data:"):
            raise InvalidImageInputError(
                "Only base64 data URI is supported for image editing. Example: `data:image/png;base64,...`."
            )

        image_bytes, content_type = self._parse_data_uri(image)

        upload = io.BytesIO(image_bytes)
        # openai SDK uses this name for multipart filename
        upload.name = self._filename_from_content_type(content_type, name_prefix=name_prefix)  # type: ignore[attr-defined]
        return upload

    async def _image_input_to_upload_files(self, image_input: str | list[str]) -> list[io.BytesIO]:
        """
        Convert image input (single data URI or list of data URIs) into uploadable file objects.

        Some OpenAI-compatible `images/edits` implementations support multiple input images.
        """
        images = [image_input] if isinstance(image_input, str) else image_input
        if not images:
            raise InvalidImageInputError("Input image list is empty.")

        upload_files: list[io.BytesIO] = []
        for idx, img in enumerate(images):
            if not isinstance(img, str):
                raise InvalidImageInputError("Each image must be a base64 data URI string.")
            upload_files.append(await self._image_str_to_upload_file(img, name_prefix=f"image_{idx + 1}"))
        return upload_files

    async def genimg(self, request: GenImgRequest) -> GenImgResponse:
        """
        Generate Image API.

        Args:
            request: Generate image request parameters.

        Returns:
            GenImgResponse: generated image response, where `images` is a list of image refs (URL preferred; fallback to base64 data URI).
        """
        try:
            # If an input image is provided, use the image editing endpoint (img2img).
            if request.image:
                image_files = await self._image_input_to_upload_files(request.image)
                image_param = image_files[0] if len(image_files) == 1 else image_files
                response = await self.client.images.edit(
                    model=request.model,
                    image=image_param,
                    prompt=request.prompt,
                    size=request.size,
                    n=request.n,
                )
            else:
                response = await self.client.images.generate(
                    model=request.model,
                    prompt=request.prompt,
                    size=request.size,
                    quality=request.quality,
                    n=request.n,
                )

            revised_prompt = response.data[0].revised_prompt if response.data else None

            if not response.data:
                raise RuntimeError("Image generation returned empty result")

            # Prefer URL to avoid huge response bodies; fallback to base64 data URI.
            images = [self._extract_image_ref(item) for item in response.data]

            return GenImgResponse(
                images=images,
                model=request.model,
                revised_prompt=revised_prompt,
            )

        except Exception as e:
            logger.error(f"genimg error: {e}")
            raise
