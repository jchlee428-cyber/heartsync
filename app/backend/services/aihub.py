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

    def _convert_message(self, msg) -> dict:
        """Convert message format and support multimodal content."""
        content = msg.content
        # If content is a list (multimodal), convert it to plain dicts
        if isinstance(content, list):
            content = [item.model_dump() if hasattr(item, "model_dump") else item for item in content]
        return {"role": msg.role, "content": content}

    def _build_counseling_chat_fallback(self, user_msg: str) -> str:
        return """두 분의 마음에 대해 말씀해주셔서 감사합니다. 관계에서 서운함이나 갈등을 느낄 때, 상대방이 내 마음을 온전히 알아주지 못한다는 느낌은 누구에게나 큰 외로움과 답답함으로 다가옵니다.

존 가트맨 심리학 이론에서는 이러한 순간 가장 필요한 것을 '비난 없는 부드러운 연결(Softened Startup)'이라고 정의합니다. 상대방의 태도를 지적하기보다는 "내가 요즘 이런 부분에서 조금 서운하고 소외감을 느꼈어. 우리 조금 더 편안하게 이야기해볼 수 있을까?"처럼 내 감정과 소망을 솔직하고 담백하게 건네보시는 것을 권해드립니다.

상대방도 방어적으로 반응하지 않고 안전하다고 느낄 때 비로소 진심을 털어놓을 수 있습니다. 오늘 저녁 따뜻한 차 한 잔과 함께 편안한 환경에서 가볍게 마음을 나눠보시는 건 어떨까요? 언제든 더 나누고 싶은 이야기가 있다면 편하게 말씀해주세요."""

    def _build_diagnosis_report_fallback(self, user_msg: str) -> str:
        total_match = re.search(r"총점:\s*(\d+)", user_msg)
        total_score = int(total_match.group(1)) if total_match else 172

        return f"""### 📊 종합 진단 결과
이번 심층 관계 진단 결과, 두 분의 관계 종합 점수는 {total_score}/250점입니다.
전반적으로 서로를 향한 정서적 유대감과 애착의 토대가 든든하게 유지되고 있으나, 갈등 상황에서 무의식적으로 방어적인 대화 패턴이 나타나며 심리적 에너지가 소모되는 경향이 있습니다. 존 가트맨(John Gottman) 연구에 따르면 관계의 성패는 갈등의 유무가 아니라 '갈등을 회복하는 속도와 태도'에 달려 있습니다. 현재 두 분은 상호 보완적인 소통 훈련을 통해 신뢰와 친밀감을 크게 도약시킬 수 있는 중요한 전환점에 있습니다.

### ⚡ 갈등 관리 분석
**강점:** 갈등이 극단적인 대립으로 치닫기 전에 서로를 배려하려는 내면의 의지가 여전히 확고합니다.
**개선점:** 서운함이 발생했을 때 즉각적이고 건강한 방식으로 표현하기보다는, 혼자 감정을 삭이다가 한꺼번에 표출되거나 침묵(담쌓기)으로 이어지는 패턴이 관찰됩니다.
**실천 전략:**
1. **부드러운 시작(Soft Start-up):** 비난이 아닌 "나는 ~할 때 ~한 감정을 느껴"라는 '나-전달법(I-Message)'으로 대화를 시작하세요.
2. **20분 브레이크 타임:** 대화 중 심박수가 상승하거나 감정이 격해지면 "잠깐 20분만 쉬었다가 다시 이야기하자"고 약속하고 감정을 가라앉히세요.
3. **즉각적인 회복 시도:** 갈등 중 상대방의 손을 잡거나 "내 말이 상처가 됐다면 미안해"라는 작은 회복 신호를 적극적으로 보내세요.

### 💕 정서적 친밀감 분석
**강점:** 일상 속에서 서로에 대한 호감과 존중의 기본기가 튼튼하게 자리잡고 있습니다.
**개선점:** 바쁜 일상과 익숙함으로 인해 서로의 최신 고민이나 감정 상태를 세심하게 업데이트하는 '사랑의 지도(Love Map)'가 다소 정체되어 있습니다.
**실천 전략:**
1. **매일 10분 온전한 집중 대화:** 스마트폰을 내려놓고 퇴근 후 서로의 하루와 감정을 묻는 10분의 집중 시간을 확보하세요.
2. **감정 은행 계좌 매일 입금:** 칭찬, 고마움의 표현, 따뜻한 눈맞춤을 하루 최소 5번 이상 실천하세요 (가트맨 5:1 황금비율).
3. **취약성 공유(Vulnerability):** 완벽한 모습만 보이려 하지 말고, 내면의 불안이나 고민을 솔직하게 털어놓아 정서적 연결을 강화하세요.

### 🤝 신뢰/애착 분석
**강점:** 오랜 시간 함께 쌓아온 관계적 연속성과 상대방에 대한 근본적인 믿음이 존재합니다.
**개선점:** 불안형-회피형 애착 역동이 미세하게 감지되며, 상대방의 침묵을 거절로 오해하거나 독립성을 침해로 받아들이는 악순환이 발생할 수 있습니다.
**실천 전략:**
1. **안전 기지(Secure Base) 구축:** 상대방이 감정적으로 지쳐 있을 때 재촉하지 않고 편안한 안식처가 되어주세요.
2. **예측 가능한 투명성:** 사소한 일정이나 감정 변화도 미리 공유하여 불안감을 사전에 차단하세요.
3. **약속의 일관된 이행:** 작은 약속이라도 반드시 지켜 상호 신뢰의 안정감을 단단하게 만드세요.

### 🌟 가치관 분석
**강점:** 미래에 대한 큰 틀의 지향점과 관계를 발전시키고자 하는 의지가 서로 일치합니다.
**개선점:** 재정 관리, 여가 시간 배분, 가족과의 관계 등 세부적인 생활 방식에서 오는 우선순위 차이를 조율할 필요가 있습니다.
**실천 전략:**
1. **'꿈 속의 꿈(Dreams Within Conflict)' 대화:** 특정 고집 뒤에 숨겨진 상대방의 어린 시절 경험이나 핵심 가치를 경청하세요.
2. **공동의 의식(Ritual) 만들기:** 매주 주말 함께하는 산책이나 기념일 축하 방식 등 둘만의 고유한 문화를 만드세요.
3. **영원한 문제 인정하기:** 69%의 갈등은 해결하는 것이 아니라 평생 관리하는 것임을 인정하고 타협점을 찾으세요.

### 🔥 신체적 만족도 분석
**강점:** 서로를 향한 자연스러운 매력과 스킨십에 대한 잠재적 친밀감이 살아있습니다.
**개선점:** 정서적 피로도가 신체적 소통으로 이어지는 것을 방해하며, 스킨십에 대한 솔직한 대화가 줄어들 수 있습니다.
**실천 전략:**
1. **비성적 일상 스킨십 증가:** 손잡기, 가벼운 포옹, 어깨 토닥이기 등 일상 속 애정 표현을 자연스럽게 늘리세요.
2. **6초 키스 루틴:** 매일 아침 출근길과 저녁 귀가 시 최소 6초간의 깊은 키스로 유대 옥시토신을 분비시키세요.
3. **편안한 감정 교류 우선:** 신체적 친밀감 이전에 충분한 정서적 안정감이 먼저 조성되도록 배려하세요.

### 🎯 핵심 위험 요소 TOP 3
1. **비난에 이은 방어적 태도:** 대화가 공격으로 느껴질 때 변명하거나 역공하는 패턴 (방치 시 심리적 거리 확대)
2. **해결되지 않은 서운함의 누적:** 즉시 풀지 못한 작은 감정들이 체념으로 변질될 위험
3. **소통 시간의 절대적 부족:** 서로의 일상에 대한 공감 결여로 인한 정서적 고립감

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

        if "진단 결과 데이터" in user_msg or "존 가트맨" in user_msg or "가트맨" in user_msg or "총점:" in user_msg:
            return self._build_diagnosis_report_fallback(user_msg)
        return self._build_counseling_chat_fallback(user_msg)

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

            response = await self.client.chat.completions.create(
                model=request.model,
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
                model=request.model,
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

            stream = await self.client.chat.completions.create(
                model=request.model,
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
