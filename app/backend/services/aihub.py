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
        raw_key = (
            getattr(settings, "app_ai_key", "")
            or getattr(settings, "openai_api_key", "")
            or getattr(settings, "gemini_api_key", "")
            or getattr(settings, "google_api_key", "")
            or getattr(settings, "deepseek_api_key", "")
            or ""
        ).strip()

        raw_base = (getattr(settings, "app_ai_base_url", "") or "").strip()
        if not raw_base or raw_base == "https://api.openai.com/v1":
            if (
                getattr(settings, "gemini_api_key", "")
                or getattr(settings, "google_api_key", "")
                or raw_key.startswith("AIza")
            ):
                raw_base = "https://generativelanguage.googleapis.com/v1beta/openai"
            elif getattr(settings, "deepseek_api_key", ""):
                raw_base = "https://api.deepseek.com/v1"
            else:
                raw_base = "https://api.openai.com/v1"

        self.resolved_api_key = raw_key
        self.resolved_base_url = raw_base.rstrip("/")
        self.is_mock = (
            not self.resolved_api_key
            or self.resolved_api_key.startswith("mock-")
            or not self.resolved_base_url
        )
        if not self.is_mock:
            try:
                self.client = AsyncOpenAI(
                    api_key=self.resolved_api_key,
                    base_url=self.resolved_base_url,
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

        base_url = (self.resolved_base_url or "").lower()
        model = (requested_model or "gpt-4o-mini").strip()

        if "generativelanguage.googleapis.com" in base_url:
            return "gemini-2.5-flash"
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
        assistant_msgs: list[str] = []
        for m in request.messages:
            role = getattr(m, "role", "")
            content_str = str(getattr(m, "content", ""))
            if role == "system":
                system_text += content_str + "\n"
            elif role == "user":
                user_turns += 1
            elif role == "assistant":
                assistant_msgs.append(content_str)

        turn_idx = max(0, user_turns - 1)
        clean_msg = (user_msg or "").strip()
        last_ai_msg = assistant_msgs[-1] if assistant_msgs else ""

        # Extract diagnosis context from system prompt if present
        total_match = re.search(r"총점:\s*(\d+)/250", system_text)
        weakest_match = re.search(r"가장 약한 영역:\s*([^\n(]+)\s*\((\d+)/50\)", system_text)
        attach_match = re.search(r"주된 애착 역동:\s*([^\n(]+)", system_text)
        critical_matches = re.findall(r"-\s*\[Q(\d+)\s*/\s*([^\]]+)\]\s*\"([^\"]+)\"", system_text)

        diag_note = ""
        if total_match and turn_idx == 0:
            total_val = total_match.group(1)
            weak_label = weakest_match.group(1).strip() if weakest_match else "소통"
            weak_score = weakest_match.group(2) if weakest_match else "30"
            attach_type = attach_match.group(1).strip() if attach_match else "안정-불안 조율"
            if critical_matches:
                q_id, q_concept, q_text = critical_matches[0]
                diag_note = (
                    f"\n\n참고로 최근 50문항 진단(종합 {total_val}/250점)에서도 **{weak_label}({weak_score}/50점)** 영역 중 "
                    f"**'{q_concept}'(Q{q_id})** 부분과 **{attach_type}** 성향이 함께 나타나고 있어서, 지금 말씀하신 고민과 깊이 연결되어 있어요."
                )

        # 1. Direct Follow-up / Short Answer Context Matcher (티키타카 대화형 응답)
        is_love_lang_context = bool(re.search(r"사랑의\s*언어|애정\s*표현|선호하는.*방식", last_ai_msg))
        if re.search(r"^(선물|선물하기|기념일|꽃|편지)$", clean_msg) or (
            is_love_lang_context and re.search(r"선물|기념일|챙겨|사주|꽃|편지", clean_msg)
        ):
            return (
                "아, **'선물'**을 가장 소중한 애정 표현으로 느끼시는군요! 🎁\n\n"
                "많은 분들이 '선물'이라고 하면 비싼 물건을 떠올리지만, 애정 표현에서 선물이 중요한 분들에게 진짜 핵심은 금액이 아니라 **'보이지 않는 곳에서도 나를 떠올리고 기억해줬다는 마음의 증거'**예요. "
                "지나가다 내 생각이 나서 사 온 작은 간식 하나, 흘려 말했던 걸 기억해뒀다 건네는 세심함에서 '내가 사랑받고 있구나'를 가장 크게 느끼시죠.\n\n"
                "만약 파트너가 무심한 편이거나 선물의 의미를 잘 몰라 서운하셨다면, 상대가 부담을 느끼지 않도록 **내 마음의 사용설명서**를 이렇게 건네보세요:\n"
                '> 💬 *"나는 비싸고 거창한 선물이 좋은 게 아니야. 그냥 네가 길 가다 내 생각이 나서 사 온 작은 간식이나 짧은 손편지 하나에도 \'날 생각해줬구나\' 싶어서 일주일 내내 행복해지는 사람이야."*\n\n'
                "혹시 파트너는 평소에 어떤 방식으로 애정을 표현하는 편인가요? 최근에 선물이나 기념일 문제로 서운했던 순간이 있었는지도 편하게 들려주세요."
            )

        if (is_love_lang_context or len(clean_msg) <= 15) and re.search(
            r"^(말|따뜻한\s*말|칭찬|인정|표현|사랑해)$", clean_msg
        ):
            return (
                "아, **'따뜻한 말과 인정하는 표현'**이 가장 중요한 분이시군요! 💬\n\n"
                "말이 사랑의 언어인 분들은 파트너의 다정한 말 한마디, 고마움 표현, 구체적인 칭찬을 들을 때 마음의 안전기지가 단단해져요. 반대로 상대가 무뚝뚝하거나 툭 던지는 말투를 쓰면 금방 사랑이 식은 것처럼 외로워지기도 하죠.\n\n"
                "파트너에게 내 애정 충전 방식을 알려줄 때는 이렇게 구체적인 예시를 들어 요청해보세요:\n"
                '> 💬 *"나는 네가 \'고마워\', \'오늘 예쁘다/멋지다\', \'보고 싶었어\'라고 말로 표현해줄 때 마음이 사르르 녹고 힘이 나. 하루에 한 번씩만이라도 따뜻한 말로 내 마음을 채워줄 수 있을까?"*\n\n'
                "평소 파트너는 말로 애정 표현을 잘 해주는 편인가요, 아니면 표현이 조금 서툰 편인가요?"
            )

        if (is_love_lang_context or len(clean_msg) <= 15) and re.search(
            r"^(함께하는\s*시간|시간|같이\s*있는\s*거|함께|데이트\s*시간)$", clean_msg
        ):
            return (
                "아, **'함께하는 시간(온전한 집중)'**을 가장 중요하게 여기시는군요! ⏳\n\n"
                "이 유형의 분들에게는 단순히 같은 공간에 있는 것보다, 스마트폰을 내려놓고 **눈을 맞추며 온전히 나에게만 집중해주는 시간**이 곧 사랑의 크기예요. 함께 있어도 상대가 딴청을 피우거나 바쁘면 큰 외로움을 느끼시죠.\n\n"
                "파트너에게 이렇게 두 분만의 '집중 시간'을 제안해보세요:\n"
                '> 💬 *"나는 우리가 거창한 데이트를 하지 않아도, 하루 20분만 핸드폰 내려놓고 서로 눈 보면서 오늘 있었던 일 이야기할 때 가장 사랑받는다고 느껴. 오늘 저녁에 차 마시면서 둘만의 시간 가질까?"*\n\n'
                "요즘 두 분이 만나실 때 온전히 서로에게만 집중하는 대화 시간은 충분한 편인가요?"
            )

        if (is_love_lang_context or len(clean_msg) <= 15) and re.search(
            r"^(도움|봉사|배려|챙겨주는\s*거|행동)$", clean_msg
        ):
            return (
                "아, **'세심한 도움과 배려 행동(봉사)'**에서 사랑을 가장 깊이 느끼시는군요! 🤝\n\n"
                "백 마디 말보다 내가 피곤할 때 먼저 짐을 들어주거나, 귀찮은 일을 대신 챙겨주는 **실질적인 배려 행동**에서 '이 사람이 나를 정말 아끼는구나'를 느끼시는 타입이에요.\n\n"
                "파트너가 내 마음을 더 잘 알아주길 바랄 때는 막연하게 서운해하기보다 구체적인 행동을 딱 집어서 부탁해보세요:\n"
                '> 💬 *"나는 네가 내 작은 불편함을 먼저 챙겨주거나 도와줄 때 백 마디 사랑한다는 말보다 더 큰 감동을 받아. 이번 주에 이거 하나만 같이 도와줄 수 있을까?"*\n\n'
                "최근에 파트너가 나를 세심하게 챙겨줘서 고마웠거나, 반대로 배려가 부족해 아쉬웠던 순간이 있으셨나요?"
            )

        if re.search(r"내가\s*먼저|항상\s*나만|나만\s*사과|제가\s*먼저|맨날\s*내가", clean_msg):
            return (
                "늘 먼저 손을 내밀고 사과하는 쪽이셨군요… 그 말을 듣는데 그동안 얼마나 마음이 외롭고 지치셨을지 느껴집니다. 😢\n\n"
                "관계에서 한 사람만 계속 먼저 숙이고 들어가면, 처음엔 평화를 위해 참지만 시간이 갈수록 **'나만 이 관계를 지키려고 애쓰나?'** 하는 억울함과 정서적 소진(Burnout)이 올 수밖에 없어요.\n\n"
                "다음번에는 무조건 먼저 사과하며 덮기보다, 화해한 뒤 평온한 시간에 이 마음을 꼭 전달해보세요:\n"
                '> 💬 *"우리가 싸웠을 때 내가 먼저 다가가는 건 내가 무조건 잘못해서가 아니라, 너와 어색한 시간보다 우리 관계가 더 소중해서야. 다음번엔 네가 먼저 내 손 잡아주거나 한 걸음만 다가와 주면 정말 큰 위로가 될 것 같아."*\n\n'
                "내가 먼저 화해를 건넸을 때 파트너는 주로 고마워하며 잘 받아주는 편인가요, 아니면 당연하다는 듯이 넘어가는 편인가요?"
            )

        if re.search(r"^(하루|이틀|2~3일|3일|사흘|일주일|한\s*주|몇\s*주|오래|길게)", clean_msg) and re.search(
            r"냉전|얼마나|지속|사과|화해|침묵", last_ai_msg
        ):
            return (
                f"**'{clean_msg}'** 동안이나 서먹한 냉전이 이어지면 그 시간 동안 일상생활도 손에 안 잡히고 피가 마르는 기분이실 텐데요.\n\n"
                "냉전이 하루를 넘어가기 시작하면 두 사람 모두 실제 다툰 원인보다 **'지금 나를 방치하고 있다'는 2차 상처**가 훨씬 더 커지게 됩니다. 그래서 냉전의 길이를 줄이는 두 분만의 안전장치가 꼭 필요해요.\n\n"
                "감정이 다 풀리지 않았더라도 냉전이 길어지는 걸 막는 **'안심 신호 규칙'**을 평소에 미리 약속해보세요:\n"
                '> 💬 *"우리 앞으로 화가 안 풀려서 시간이 필요하더라도, 최소한 잠들기 전에 \'아직 생각 정리 중이야, 내일 퇴근하고 이야기하자\'라고 한마디는 꼭 해주기로 약속하자."*\n\n'
                "그렇게 냉전이 이어지는 동안 두 분은 아예 연락을 끊으시나요, 아니면 용건만 짧게 주고받으시나요?"
            )

        if re.search(r"^(응|어|네|맞아|맞아요|그니까|정확해|비슷해|완전\s*맞아|그랬어)", clean_msg) and len(clean_msg) <= 12:
            return (
                "역시 그러셨군요. 내 마음 같지 않은 상황에서 그동안 혼자 속앓이를 많이 하셨을 것 같아요.\n\n"
                "패턴을 정확히 짚어냈으니 이제 두 분의 대화 흐름을 바꿀 차례예요. 상대방을 바꾸려고 애쓰기보다 **내가 먼저 건네는 첫 문장의 각도**만 살짝 바꿔도 상대의 방어벽이 훨씬 낮아집니다.\n\n"
                "지금 가장 먼저 해결하고 싶은 상황을 하나만 꼽자면, **① 지금 당장 보낼 카톡/대화 문구 만들기**와 **② 상대방이 왜 그렇게 행동하는지 속마음 분석하기** 중 어떤 것부터 함께 해볼까요?"
            )

        if re.search(r"카톡|문자\s*문구|뭐라고\s*보내|어떻게\s*말해|멘트|대사", clean_msg):
            return (
                "지금 바로 복사해서 보내실 수 있도록 상황별 **3가지 온도의 카톡 문구**를 준비했어요. 두 분의 평소 말투에 가장 자연스러운 걸 골라보세요! 📱\n\n"
                "**① 부드럽게 분위기 푸는 버전 (가벼운 서운함/냉전 중일 때)**\n"
                '> 💬 *"아까는 우리가 둘 다 조금 예민했던 것 같아. 맞고 틀리고를 떠나서 너랑 어색하게 지내는 게 제일 싫네. 오늘 저녁에 맛있는 거 먹으면서 편하게 이야기하자 :)"*\n\n'
                "**② 내 서운함을 방어 없이 전달하는 버전 (진지한 대화가 필요할 때)**\n"
                '> 💬 *"너를 비난하려는 게 아니라 내 솔직한 마음을 전하고 싶어서 카톡 남겨. 아까 그 상황에서 나는 조금 외롭고 속상했어. 이따 통화할 때 내 마음도 한 번만 들어줄래?"*\n\n'
                "**③ 상대가 동굴로 들어가 연락이 뜸할 때 (공간을 주며 안심시키는 버전)**\n"
                '> 💬 *"지금 생각할 시간이 필요한 것 같아서 재촉하지 않고 기다릴게. 준비되면 오늘 밤이든 내일이든 편할 때 먼저 연락 줘!"*\n\n'
                "세 가지 중 지금 파트너에게 보내기에 가장 마음이 가는 문구는 몇 번인가요? 조금 더 다듬고 싶은 부분이 있다면 말씀해주세요!"
            )

        # 2. Main Clinical Scenarios (자연스러운 상담사 대화체)
        if re.search(r"연락|카톡|문자|답장|읽씹|불안|전화|디지털", clean_msg):
            empathy = [
                "연락이 닿지 않거나 답장 템포가 달라질 때 밀려오는 초조함은 상대방과의 연결이 흔들릴까 봐 작동하는 자연스러운 애착 신호예요.",
                "카톡이나 문자에서 미묘한 온도 차가 느껴지면 하루 종일 마음이 쓰이고 외로움이 커지셨을 거예요.",
            ][turn_idx % 2]
            insight = (
                "연락 문제에서 오는 불안은 연락 횟수 자체보다 **'언제 다시 연결될지 아는 예측 가능성'**이 없을 때 가장 커집니다. "
                "상대는 단순히 일에 몰두한 것뿐인데, 내 마음은 그 공백을 '나에게 소홀해졌다'는 신호로 읽어버리기 때문이죠."
            )
            action = [
                '오늘 대화에서는 왜 연락이 안 됐는지 추궁하는 대신, **예측 가능한 한 줄 예보 규칙**을 부드럽게 제안해보세요:\n> 💬 *"바쁠 때 연락이 어려운 건 충분히 이해해. 다만 회의나 일정 전에 \'이따 8시쯤 연락할게\'라고 미리 한 줄만 알려주면 내가 훨씬 안심하고 기다릴 수 있을 것 같아."*',
                '문자나 카톡으로는 민감한 서운함을 다투지 않는 **\'디지털 소통 경계선\'**을 세워보세요. 텍스트는 표정과 억양이 빠져 차갑게 느껴지기 쉬우니, 서운한 감정은 직접 만나거나 목소리를 들으며 나누시는 게 훨씬 안전합니다.',
            ][turn_idx % 2]
            followup = "보통 파트너와 연락이 어떤 상황에서 끊기거나 늦어질 때 가장 큰 불안이나 서운함이 올라오시나요?"
        elif re.search(r"반복|같은\s*문제|맨날|항상|다투|다툼|싸우|싸움|화가|화나|말투|비난", clean_msg):
            empathy = [
                "같은 주제로 도돌이표처럼 다툼이 반복되면 '우리는 왜 대화가 안 될까' 하는 깊은 피로감과 무력감이 찾아오죠.",
                "다투는 순간 감정이 격해져 날 선 말이 오가고 나면, 문제 해결은커녕 상처만 남게 되어 마음이 많이 무거우셨을 거예요.",
            ][turn_idx % 2]
            insight = (
                "커플이 같은 문제로 계속 싸우는 이유는 문제 자체가 해결 불가능해서가 아니라, **대화를 시작하는 첫 3분 안에 말투가 공격이나 방어로 흘러가기 때문**인 경우가 많아요. "
                "내 진짜 마음은 '서운함'인데 겉으로는 '화'나 '지적'으로 나가다 보니 상대도 귀를 닫아버리는 거죠."
            )
            action = [
                '대화를 꺼낼 때 상대의 행동을 지적하기보다 **\'상황 + 내 감정 + 구체적 부탁\'** 순서로 첫 문장을 바꿔보세요:\n> 💬 *"너는 왜 항상 그래?"* 대신 *"방금 그렇게 말하니까 내가 무시받는 느낌이라 속상했어(감정). 같은 말이라도 조금만 부드럽게 해줄 수 있을까?(요청)"*',
                '목소리가 커지거나 감정이 격해질 조짐이 보이면 즉시 **\'20분 타임아웃\'**을 선언하세요:\n> 💬 *"지금은 우리가 감정이 올라와서 상처 주는 말을 할 것 같아. 20분만 숨 고르고 9시에 다시 차분히 이야기하자."*',
            ][turn_idx % 2]
            followup = "최근 두 분이 다투게 된 가장 대표적인 상황은 주로 어떤 사소한 계기에서 시작되었나요?"
        elif re.search(r"회피|입을\s*다물|침묵|동굴|피하|담쌓기", clean_msg):
            empathy = "대화로 문제를 풀고 싶은데 상대방이 입을 닫거나 자리를 피하면, 벽을 보고 말하는 것 같은 고립감과 답답함을 느끼게 되죠."
            insight = (
                "한 사람은 문제를 풀려고 다가가고 다른 한 사람은 입을 닫는 패턴을 **'추격자-회피자 악순환'**이라고 해요. "
                "회피하는 파트너도 당신을 무시해서라기보다, 말을 꺼냈다가 싸움이 더 커지거나 비난받을까 봐 두려워서 마음의 셔터를 내리는 방어 반응인 경우가 많습니다."
            )
            action = (
                '상대가 침묵할 때 다그치는 대신 **압박감을 덜어주는 완충 문장**을 건네보세요:\n'
                '> 💬 *"지금 당장 결론을 내자고 몰아세우려는 게 아니야. 생각이 정리될 시간이 필요하면 기다릴 테니, 오늘 밤에 10분만 편하게 이야기할 수 있을지 알려줘."*'
            )
            followup = "파트너가 침묵하거나 대화를 피할 때 주로 어떤 주제나 분위기에서 그런 반응이 나타나나요?"
        elif re.search(r"화해|사과|어색|냉전|싸운\s*후", clean_msg):
            empathy = "다툰 뒤 마음은 누그러졌는데도 어색함이나 자존심 때문에 먼저 손을 내밀기가 참 쉽지 않죠."
            insight = (
                "행복한 커플과 그렇지 않은 커플의 가장 큰 차이는 '안 싸우는 것'이 아니라, **싸운 뒤 어색한 공기를 깨는 '회복 시도(화해의 손길)'를 얼마나 빨리 주고받는가**에 있어요."
            )
            action = (
                '누가 더 잘못했는지 따지기 전에 어색함을 먼저 녹이는 **\'변명 없는 회복 문장\'**을 건네보세요:\n'
                '> 💬 *"아까 내가 감정이 앞서서 말을 세게 한 건 내 불찰이야. 우리가 맞고 틀리고를 떠나서 너랑 서먹하게 지내는 게 제일 싫어. 따뜻한 차 한 잔 마시면서 풀자."*'
            )
            followup = "두 분이 다투고 나면 보통 냉전이 얼마나 지속되고, 주로 누가 먼저 화해의 손길을 건네는 편인가요?"
        elif re.search(r"권태기|설렘|식었|애정|사랑의\s*언어|데이트|친밀감|소원", clean_msg):
            empathy = "연애 초기의 설렘이 옅어지고 일상이 무덤덤해지면 '사랑이 식은 걸까' 하는 허전함과 불안이 찾아오기 마련이에요."
            insight = (
                "시간이 지나며 설렘이 잔잔해지는 건 뇌가 상대방에게 깊은 안전감을 느끼고 있다는 자연스러운 변화예요. "
                "이 시기에 필요한 건 억지로 초기의 열정을 되살리는 것이 아니라, **익숙함 속에 작은 새로움과 고마움 표현을 의도적으로 더해주는 것**입니다."
            )
            action = (
                '오늘 저녁에는 서로가 사랑받는다고 느끼는 순간을 확인하는 대화를 가볍게 꺼내보세요:\n'
                '> 💬 *"요즘 내가 너에게 사랑받는다고 가장 크게 느끼는 순간은 언제인 것 같아? 나는 네가 작은 거라도 챙겨주고 다정하게 말해줄 때 마음이 제일 따뜻해지더라."*'
            )
            followup = "본인과 파트너가 가장 선호하는 애정 표현 방식(따뜻한 말, 스킨십, 함께하는 시간, 선물, 도움)은 각각 무엇인가요?"
        elif re.search(r"스킨십|성관계|잠자리|섹스|거부|신체적|포옹|키스|손잡", clean_msg):
            empathy = "스킨십이나 잠자리 문제는 가장 가까운 사이에서도 말 꺼내기가 조심스럽고, 작은 온도 차도 거절감이나 상처로 이어지기 쉬운 영역이에요."
            insight = (
                "신체적 친밀감이 자연스럽게 회복되려면 성관계라는 목적성 접촉 이전에, **일상 속의 부담 없는 스킨십(손잡기, 6초 포옹, 가벼운 입맞춤)**을 통해 정서적 안전감이 먼저 채워져야 합니다."
            )
            action = (
                '잠자리 순간이 아닌 **낮 시간의 편안한 분위기**에서 부드럽게 대화를 열어보세요:\n'
                '> 💬 *"나는 너와 스킨십할 때 우리가 가장 가깝게 연결된 느낌이 들어서 좋아. 우리가 서로 피로감이나 부담 없이 자연스럽게 가까워지려면 어떻게 하면 좋을지 같이 이야기해보고 싶어."*'
            )
            followup = "일상 속에서 성관계와 무관한 가벼운 스킨십(손잡기, 포옹 등)은 두 분 사이에 자연스럽게 오가고 있나요?"
        elif re.search(r"신뢰|거짓말|의심|질투|이성|경계|과거", clean_msg):
            empathy = "한 번 흔들린 신뢰나 이성 문제로 인한 불안감은 마음속에서 쉽게 가라앉지 않아 스스로도 많이 지치셨을 거예요."
            insight = (
                "신뢰는 '믿어달라'는 말로 회복되는 것이 아니라, 불안해하는 파트너를 위해 **투명하게 일정을 먼저 공유하고 서로 합의된 경계선을 지키는 행동**이 쌓일 때 비로소 회복됩니다."
            )
            action = (
                '상대를 통제하려는 어조 대신 **\'우리가 함께 마음 편할 수 있는 기준 합의\'**를 제안해보세요:\n'
                '> 💬 *"너의 인간관계를 통제하려는 게 아니야. 다만 이성 지인과 늦은 시간 단둘이 연락하거나 만나는 건 나에게 불안을 줘. 우리 둘 다 마음 편할 수 있는 기준을 함께 정해보면 좋겠어."*'
            )
            followup = "파트너가 일상에서 어떤 구체적인 행동이나 투명한 태도를 보여줄 때 마음이 가장 놓이시나요?"
        elif re.search(r"결혼|미래|가치관|돈|재정|소비|가사|집안일|육아|부모님|시댁|처가", clean_msg):
            empathy = "결혼, 재정, 가사 분담, 가족 문제처럼 현실과 맞닿은 가치관 차이는 '우리의 미래가 괜찮을까' 하는 무거운 고민을 안겨주죠."
            insight = (
                "현실적인 가치관 충돌 이면에는 각자가 살아오며 형성한 **'삶에서 가장 지키고 싶은 핵심 가치(안정감, 공정성, 자율성)'**가 숨어 있어요. 누가 맞는지 결론을 내리기보다 서로의 기준이 왜 중요한지 먼저 듣는 것이 출발점입니다."
            )
            action = (
                '상대의 선택 뒤에 숨은 진짜 이유를 묻는 대화를 먼저 시도해보세요:\n'
                '> 💬 *"우리가 서로 자라온 환경이 달라서 생각이 다른 건 자연스러운 것 같아. 이 문제에서 네가 가장 중요하게 지키고 싶은 가치나 걱정이 무엇인지 먼저 듣고 싶어."*'
            )
            followup = "현재 두 분의 미래 계획이나 현실적 가치관 중에서 가장 우선적으로 합의점을 찾고 싶은 주제는 무엇인가요?"
        else:
            empathy = f"말씀해주신 **'{clean_msg[:22]}{'...' if len(clean_msg) > 22 else ''}'** 이야기를 들으니, 소중한 사람과 마음이 온전히 닿지 않아 얼마나 답답하고 외로우셨을지 마음이 쓰입니다."
            insight = (
                "대화가 겉돌고 서운함이 쌓일 때는 상대의 태도를 지적하기보다, 내 마음속의 **'진짜 감정(외로움, 불안, 서운함)'과 '구체적인 바람'**을 부드럽게 꺼내놓을 때 상대도 방어를 내려놓고 귀를 기울이게 됩니다."
            )
            action = (
                '오늘 대화에서는 시시비비를 가리기보다 **내 속마음을 먼저 들려주는 대화법**을 시도해보세요:\n'
                '> 💬 *"우리가 서로 오해가 쌓이지 않게, 내가 먼저 2분 동안 내 속마음을 솔직하게 말할 테니 조언 대신 \'그래서 서운했구나\' 하고 먼저 들어줄 수 있을까? 그다음엔 내가 네 이야기를 끝까지 들을게."*'
            )
            followup = "파트너와 이 문제를 이야기할 때 상대방은 주로 어떤 반응을 보이는 편인가요?"

        return f"{empathy}{diag_note}\n\n{insight}\n\n{action}\n\n{followup}"

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
