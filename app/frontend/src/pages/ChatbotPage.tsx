import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Bot, User, Trash2, Sparkles, BarChart3, ChevronDown, Plus, MessageSquare, Clock, Tag, Star, X, ThumbsUp } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";

const client = createClient();

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  dbId?: number;
}

interface DiagnosisData {
  id: string;
  total_score: number;
  scores: Record<string, number>;
  created_at: string;
  ai_report?: string;
}

interface ChatSession {
  id: number;
  title: string;
  diagnosis_id?: number;
  message_count: number;
  last_message_preview: string;
  updated_at: string;
}

/* ── Topic Categories ── */
interface TopicCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  systemPromptExtra: string;
  suggestions: { label: string; message: string }[];
}

const topicCategories: TopicCategory[] = [
  {
    id: "communication",
    label: "소통 & 대화",
    emoji: "💬",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "파트너와의 대화법, 경청, 감정 표현",
    systemPromptExtra: `\n\n## 상담 주제: 소통 & 대화\n이 상담은 커플 간 소통과 대화에 초점을 맞춥니다.\n- 비폭력 대화(NVC) 기법을 적극 활용하세요\n- 나-메시지(I-message) 사용법을 안내하세요\n- 적극적 경청(Active Listening) 기술을 가르쳐주세요\n- 감정 표현과 욕구 전달 방법을 구체적으로 제시하세요`,
    suggestions: [
      { label: "💬 대화가 안 통해요", message: "파트너와 대화할 때 서로 말이 안 통하는 느낌이에요. 어떻게 하면 더 효과적으로 소통할 수 있을까요?" },
      { label: "🗣️ 감정 표현이 어려워요", message: "제 감정을 파트너에게 솔직하게 표현하는 게 어려워요. 어떻게 시작하면 좋을까요?" },
      { label: "👂 경청하는 법", message: "파트너의 이야기를 더 잘 들어주고 싶은데, 적극적 경청 방법을 알려주세요." },
      { label: "📱 디지털 소통", message: "카톡이나 문자로 대화할 때 오해가 자주 생겨요. 디지털 소통 팁을 알려주세요." },
    ],
  },
  {
    id: "conflict",
    label: "갈등 해결",
    emoji: "⚡",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "다툼, 의견 충돌, 화해 방법",
    systemPromptExtra: `\n\n## 상담 주제: 갈등 해결\n이 상담은 커플 간 갈등과 다툼 해결에 초점을 맞춥니다.\n- 가트맨의 '네 기수(Four Horsemen)' 이론을 활용하세요\n- 갈등의 근본 원인을 파악하도록 도와주세요\n- 쿨다운(cool-down) 기법과 타임아웃 전략을 안내하세요\n- 건설적인 갈등 해결 5단계를 제시하세요\n- 반복되는 갈등 패턴을 인식하도록 도와주세요`,
    suggestions: [
      { label: "⚡ 같은 문제로 반복 다툼", message: "파트너와 항상 같은 문제로 다투게 돼요. 이 반복 패턴을 어떻게 끊을 수 있을까요?" },
      { label: "😤 화가 날 때 대처법", message: "다툴 때 감정 조절이 안 돼요. 화가 날 때 어떻게 대처하면 좋을까요?" },
      { label: "🤝 화해하는 방법", message: "다툰 후에 화해하는 게 어색해요. 자연스럽게 화해하는 방법을 알려주세요." },
      { label: "🏠 가사 분담 갈등", message: "가사 분담 때문에 자주 다투는데, 공평하게 나누는 방법이 있을까요?" },
    ],
  },
  {
    id: "intimacy",
    label: "친밀감 & 애정",
    emoji: "💕",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    description: "정서적 유대, 애정 표현, 로맨스",
    systemPromptExtra: `\n\n## 상담 주제: 친밀감 & 애정\n이 상담은 정서적 친밀감과 애정 표현에 초점을 맞춥니다.\n- 채프먼의 '5가지 사랑의 언어' 이론을 활용하세요\n- 정서적 은행 계좌(Emotional Bank Account) 개념을 설명하세요\n- 일상 속 작은 애정 표현 방법을 구체적으로 제안하세요\n- 권태기 극복과 로맨스 유지 전략을 안내하세요`,
    suggestions: [
      { label: "💕 권태기 극복", message: "요즘 파트너와 권태기인 것 같아요. 다시 설렘을 느끼려면 어떻게 해야 할까요?" },
      { label: "🫂 애정 표현 방법", message: "파트너에게 사랑을 더 잘 표현하고 싶은데, 구체적인 방법을 알려주세요." },
      { label: "💑 데이트 아이디어", message: "파트너와 특별한 시간을 보내고 싶어요. 친밀감을 높일 수 있는 데이트 아이디어를 추천해주세요." },
      { label: "❤️ 사랑의 언어", message: "저와 파트너의 사랑의 언어가 다른 것 같아요. 어떻게 맞춰나갈 수 있을까요?" },
    ],
  },
  {
    id: "trust",
    label: "신뢰 & 애착",
    emoji: "🤝",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "신뢰 구축, 불안, 질투, 애착 유형",
    systemPromptExtra: `\n\n## 상담 주제: 신뢰 & 애착\n이 상담은 신뢰와 애착 관계에 초점을 맞춥니다.\n- 보울비의 애착 이론(안정/불안/회피/혼란)을 활용하세요\n- 사용자의 애착 유형을 파악하고 맞춤 조언을 제공하세요\n- 신뢰 회복을 위한 단계적 접근법을 안내하세요\n- 건강한 경계 설정(boundary)의 중요성을 강조하세요`,
    suggestions: [
      { label: "🤝 신뢰 회복", message: "파트너에 대한 신뢰가 깨졌어요. 다시 신뢰를 쌓으려면 어떻게 해야 할까요?" },
      { label: "😰 불안 애착", message: "파트너가 연락이 안 되면 불안해져요. 이런 불안 애착을 어떻게 극복할 수 있을까요?" },
      { label: "💚 질투 다루기", message: "질투심이 자주 올라오는데, 건강하게 질투를 다루는 방법을 알려주세요." },
      { label: "🔒 건강한 경계", message: "파트너와의 관계에서 건강한 경계를 설정하는 방법을 알려주세요." },
    ],
  },
  {
    id: "values",
    label: "가치관 & 미래",
    emoji: "🌟",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    description: "결혼, 육아, 재정, 라이프스타일",
    systemPromptExtra: `\n\n## 상담 주제: 가치관 & 미래\n이 상담은 커플 간 가치관 차이와 미래 계획에 초점을 맞춥니다.\n- 결혼, 육아, 재정, 커리어 등 주요 가치관 영역을 다루세요\n- 가치관 차이를 '문제'가 아닌 '다름'으로 접근하도록 안내하세요\n- 타협과 절충의 구체적인 방법을 제시하세요\n- 함께 미래를 설계하는 대화 가이드를 제공하세요`,
    suggestions: [
      { label: "🌟 가치관 차이", message: "파트너와 중요한 가치관이 달라서 고민이에요. 어떻게 조율할 수 있을까요?" },
      { label: "💍 결혼 고민", message: "결혼에 대한 생각이 파트너와 다른데, 이 주제를 어떻게 대화하면 좋을까요?" },
      { label: "💰 재정 관리", message: "파트너와 돈 관리 방식이 달라서 갈등이 있어요. 어떻게 해결할 수 있을까요?" },
      { label: "👶 육아 관점", message: "아이에 대한 생각이 파트너와 달라요. 이 주제를 어떻게 풀어나갈 수 있을까요?" },
    ],
  },
  {
    id: "self_growth",
    label: "자기 성장",
    emoji: "🌱",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    description: "자존감, 개인 성장, 관계 속 나",
    systemPromptExtra: `\n\n## 상담 주제: 자기 성장\n이 상담은 관계 속에서의 자기 성장과 자존감에 초점을 맞춥니다.\n- 건강한 자존감이 관계에 미치는 영향을 설명하세요\n- 코디펜던시(공의존) 패턴을 인식하도록 도와주세요\n- 관계 속에서 자기 정체성을 유지하는 방법을 안내하세요\n- 개인 성장이 관계 발전으로 이어지는 선순환을 강조하세요`,
    suggestions: [
      { label: "🌱 관계 속 자존감", message: "관계에서 자존감이 낮아지는 느낌이에요. 어떻게 하면 자존감을 회복할 수 있을까요?" },
      { label: "🪞 나를 먼저 돌보기", message: "파트너를 챙기느라 저를 돌보지 못하고 있어요. 셀프케어 방법을 알려주세요." },
      { label: "🔄 공의존 탈출", message: "파트너에게 너무 의존하는 것 같아요. 건강한 독립성을 키우는 방법이 있을까요?" },
      { label: "✨ 함께 성장하기", message: "파트너와 함께 성장하는 관계를 만들고 싶어요. 어떻게 시작하면 좋을까요?" },
    ],
  },
];

const categoryInfo: Record<string, { label: string; emoji: string }> = {
  conflict: { label: "갈등 관리", emoji: "⚡" },
  intimacy: { label: "정서적 친밀감", emoji: "💕" },
  trust: { label: "신뢰/애착", emoji: "🤝" },
  values: { label: "가치관", emoji: "🌟" },
  physical: { label: "신체적 만족", emoji: "🔥" },
};

function getGradeLabel(total: number) {
  if (total >= 210) return "매우 건강 🟢";
  if (total >= 175) return "양호 🔵";
  if (total >= 140) return "주의 필요 🟡";
  return "위험 🔴";
}

function getGradeColor(total: number) {
  if (total >= 210) return "text-green-600 bg-green-50";
  if (total >= 175) return "text-blue-600 bg-blue-50";
  if (total >= 140) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function buildSystemPrompt(diagnosis: DiagnosisData | null, topicExtra?: string): string {
  const base = `당신은 HeartSync의 AI 관계 코치입니다. 10년 이상의 커플 상담 경력을 가진 전문 상담사처럼 행동하세요.

역할:
- 사용자의 관계 고민을 경청하고 공감합니다
- 구체적이고 실천 가능한 조언을 제공합니다
- 따뜻하면서도 전문적인 톤을 유지합니다
- 필요시 소통 기법, 갈등 해결 전략을 제안합니다
- 가트맨 이론, 애착 이론, EFT, CBT 등 심리학 이론에 기반한 조언을 제공합니다

규칙:
- 항상 한국어로 답변합니다
- 답변은 간결하되 핵심을 담아주세요 (3-5문장)
- 판단하지 않고 중립적인 입장을 유지합니다
- 심각한 상황(폭력, 학대 등)에는 전문 상담 기관을 안내합니다`;

  let prompt = base;

  if (topicExtra) {
    prompt += topicExtra;
  }

  if (!diagnosis) return prompt;

  const scores = diagnosis.scores;
  const sortedCats = Object.entries(scores).sort(([, a], [, b]) => a - b);
  const weakest = sortedCats[0];
  const strongest = sortedCats[sortedCats.length - 1];

  const diagContext = `

## 사용자 진단 데이터 (최신)
- 총점: ${diagnosis.total_score}/250 (${getGradeLabel(diagnosis.total_score)})
- 갈등 관리: ${scores.conflict || 0}/50
- 정서적 친밀감: ${scores.intimacy || 0}/50
- 신뢰/애착: ${scores.trust || 0}/50
- 가치관: ${scores.values || 0}/50
- 신체적 만족: ${scores.physical || 0}/50
- 가장 강한 영역: ${categoryInfo[strongest[0]]?.label || strongest[0]} (${strongest[1]}/50)
- 가장 약한 영역: ${categoryInfo[weakest[0]]?.label || weakest[0]} (${weakest[1]}/50)
${diagnosis.ai_report ? `\n## AI 분석 리포트 요약 (참고용)\n${diagnosis.ai_report.slice(0, 1500)}` : ""}

## 상담 지침
- 사용자의 진단 데이터를 참고하여 맞춤형 조언을 제공하세요
- 약한 영역(${categoryInfo[weakest[0]]?.label})에 대한 개선 방안을 우선적으로 다루세요
- 강한 영역(${categoryInfo[strongest[0]]?.label})은 긍정적으로 인정해주세요
- 사용자가 특정 영역에 대해 물으면 해당 점수를 기반으로 구체적으로 답변하세요
- 진단 데이터를 자연스럽게 대화에 녹여내되, 점수를 직접적으로 나열하지 마세요`;

  return prompt + diagContext;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ChatbotPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const diagnosisId = searchParams.get("diagnosisId");
  const sessionIdParam = searchParams.get("sessionId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestDiagnosis, setLatestDiagnosis] = useState<DiagnosisData | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);
  const [showDiagCard, setShowDiagCard] = useState(true);
  const [showSessionList, setShowSessionList] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingTags, setRatingTags] = useState<string[]>([]);
  const [ratingComment, setRatingComment] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const systemPromptRef = useRef<string>("");
  const savingRef = useRef(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitialData = async () => {
    try {
      const user = await client.auth.me();
      if (!user?.data) {
        setIsLoggedIn(false);
        setDiagLoading(false);
        systemPromptRef.current = buildSystemPrompt(null);
        setShowTopicPicker(true);
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "안녕하세요! 저는 HeartSync AI 관계 코치예요 💕\n\n아래에서 상담 주제를 선택하면 더 전문적인 상담을 받으실 수 있어요.\n\n💡 로그인하시면 진단 결과 기반 맞춤 상담과 대화 기록 저장이 가능해요!",
        }]);
        return;
      }

      setIsLoggedIn(true);
      await loadSessions();

      let diag: DiagnosisData | null = null;

      if (diagnosisId) {
        try {
          const res = await client.entities.diagnoses.get({ id: diagnosisId });
          if (res.data) {
            const d = res.data;
            diag = {
              id: String(d.id),
              total_score: d.total_score || 0,
              scores: typeof d.scores === "string" ? JSON.parse(d.scores) : d.scores || {},
              created_at: d.created_at || "",
              ai_report: d.ai_report || "",
            };
          }
        } catch { /* fall through */ }
      }

      if (!diag) {
        try {
          const res = await client.entities.diagnoses.query({
            query: {},
            sort: "-created_at",
            limit: 1,
          });
          const items = res.data?.items || [];
          if (items.length > 0) {
            const d = items[0];
            diag = {
              id: String(d.id),
              total_score: d.total_score || 0,
              scores: typeof d.scores === "string" ? JSON.parse(d.scores) : d.scores || {},
              created_at: d.created_at || "",
              ai_report: d.ai_report || "",
            };
          }
        } catch { /* no diagnosis */ }
      }

      setLatestDiagnosis(diag);
      systemPromptRef.current = buildSystemPrompt(diag);

      if (sessionIdParam) {
        await loadSession(parseInt(sessionIdParam, 10));
      } else {
        setShowTopicPicker(true);
        setWelcomeMessage(diag);
      }
    } catch {
      systemPromptRef.current = buildSystemPrompt(null);
      setShowTopicPicker(true);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "안녕하세요! 저는 HeartSync AI 관계 코치예요 💕\n\n아래에서 상담 주제를 선택해주세요.",
      }]);
    } finally {
      setDiagLoading(false);
    }
  };

  const setWelcomeMessage = (diag: DiagnosisData | null) => {
    if (diag) {
      const grade = getGradeLabel(diag.total_score);
      const scores = diag.scores;
      const sorted = Object.entries(scores).sort(([, a], [, b]) => a - b);
      const weakestCat = categoryInfo[sorted[0][0]];

      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `안녕하세요! 저는 HeartSync AI 관계 코치예요 💕\n\n📊 최근 진단 결과를 확인했어요:\n• 종합 점수: ${diag.total_score}/250 (${grade})\n• 가장 관심이 필요한 영역: ${weakestCat?.emoji || ""} ${weakestCat?.label || sorted[0][0]}\n\n아래에서 상담 주제를 선택하면 더 전문적인 상담을 받으실 수 있어요!`,
      }]);
    } else {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "안녕하세요! 저는 HeartSync AI 관계 코치예요 💕\n\n아래에서 상담 주제를 선택해주세요.\n\n💡 진단을 먼저 받으시면 더 맞춤화된 상담을 받으실 수 있어요!",
      }]);
    }
  };

  const handleSelectTopic = (topic: TopicCategory) => {
    setSelectedTopic(topic);
    setShowTopicPicker(false);
    systemPromptRef.current = buildSystemPrompt(latestDiagnosis, topic.systemPromptExtra);

    const topicWelcome: Message = {
      id: "topic-welcome",
      role: "assistant",
      content: `${topic.emoji} **${topic.label}** 주제로 상담을 시작할게요!\n\n${topic.description}에 대해 전문적으로 도와드리겠습니다.\n\n아래 추천 질문을 선택하거나, 자유롭게 고민을 이야기해주세요.`,
    };

    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== "topic-welcome");
      return [...filtered, topicWelcome];
    });
  };

  const handleChangeTopic = () => {
    setSelectedTopic(null);
    setShowTopicPicker(true);
    systemPromptRef.current = buildSystemPrompt(latestDiagnosis);
  };

  const loadSessions = async () => {
    try {
      const res = await client.entities.chat_sessions.query({
        query: {},
        sort: "-updated_at",
        limit: 20,
      });
      const items = (res.data?.items || []).map((s: any) => ({
        id: s.id,
        title: s.title || "상담 대화",
        diagnosis_id: s.diagnosis_id,
        message_count: s.message_count || 0,
        last_message_preview: s.last_message_preview || "",
        updated_at: s.updated_at || s.created_at || "",
      }));
      setSessions(items);
    } catch {
      // Non-critical
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const res = await client.entities.chat_messages.query({
        query: { session_id: sessionId },
        sort: "created_at",
        limit: 200,
      });
      const items = res.data?.items || [];

      if (items.length === 0) {
        setCurrentSessionId(sessionId);
        setWelcomeMessage(latestDiagnosis);
        return;
      }

      const loadedMessages: Message[] = items.map((m: any, idx: number) => ({
        id: `loaded-${idx}-${m.id}`,
        role: m.role as "user" | "assistant",
        content: m.content || "",
        dbId: m.id,
      }));

      setCurrentSessionId(sessionId);
      setMessages(loadedMessages);
      setShowSessionList(false);
      setShowTopicPicker(false);
      toast.success("이전 상담을 불러왔습니다.");
    } catch {
      toast.error("상담 기록을 불러올 수 없습니다.");
    }
  };

  const createNewSession = async (): Promise<number | null> => {
    if (!isLoggedIn) return null;
    try {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const res = await client.entities.chat_sessions.create({
        data: {
          title: selectedTopic ? `${selectedTopic.emoji} ${selectedTopic.label}` : "새 상담",
          diagnosis_id: latestDiagnosis ? parseInt(latestDiagnosis.id, 10) : null,
          message_count: 0,
          last_message_preview: "",
          created_at: now,
          updated_at: now,
        },
      });
      const newId = res.data?.id;
      if (newId) {
        setCurrentSessionId(newId);
        return newId;
      }
    } catch {
      // Non-critical
    }
    return null;
  };

  const saveMessage = async (sessionId: number, role: string, content: string) => {
    if (!isLoggedIn || savingRef.current) return;
    savingRef.current = true;
    try {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await client.entities.chat_messages.create({
        data: {
          session_id: sessionId,
          role,
          content,
          created_at: now,
        },
      });

      const preview = content.length > 50 ? content.slice(0, 50) + "..." : content;
      await client.entities.chat_sessions.update({
        id: String(sessionId),
        data: {
          message_count: messages.filter((m) => m.id !== "welcome" && m.id !== "topic-welcome").length + 1,
          last_message_preview: preview,
          updated_at: now,
          ...(messages.filter((m) => m.id !== "welcome" && m.id !== "topic-welcome").length <= 1 && role === "user"
            ? { title: selectedTopic ? `${selectedTopic.emoji} ${content.length > 25 ? content.slice(0, 25) + "..." : content}` : (content.length > 30 ? content.slice(0, 30) + "..." : content) }
            : {}),
        },
      });
    } catch {
      // Non-critical
    } finally {
      savingRef.current = false;
    }
  };

  const handleSend = useCallback(async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isStreaming) return;

    let sessionId = currentSessionId;
    if (!sessionId && isLoggedIn) {
      sessionId = await createNewSession();
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    if (sessionId) {
      saveMessage(sessionId, "user", msgText);
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const chatHistory = messages
      .filter((m) => m.id !== "welcome" && m.id !== "topic-welcome")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let fullContent = "";
    const finalSessionId = sessionId;

    try {
      await client.ai.gentxt({
        messages: [
          { role: "system", content: systemPromptRef.current },
          ...chatHistory,
          { role: "user", content: msgText },
        ],
        model: "deepseek-v3.2",
        stream: true,
        onChunk: (chunk: any) => {
          if (chunk.content) {
            fullContent += chunk.content;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
            );
          }
        },
        onComplete: () => {
          setIsStreaming(false);
          if (finalSessionId && fullContent) {
            saveMessage(finalSessionId, "assistant", fullContent);
          }
        },
        onError: (error: any) => {
          setIsStreaming(false);
          toast.error(error?.message || "응답 생성 중 오류가 발생했습니다.");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: "죄송합니다, 일시적인 오류가 발생했어요. 다시 시도해주세요." } : m
            )
          );
        },
      });
    } catch (error: any) {
      setIsStreaming(false);
      toast.error(error?.data?.detail || error?.message || "오류가 발생했습니다.");
    }
  }, [input, isStreaming, messages, currentSessionId, isLoggedIn, latestDiagnosis, selectedTopic]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setSelectedTopic(null);
    setShowTopicPicker(true);
    setShowSessionList(false);
    setHasRated(false);
    setRatingValue(0);
    setRatingTags([]);
    setRatingComment("");
    setWelcomeMessage(latestDiagnosis);
    systemPromptRef.current = buildSystemPrompt(latestDiagnosis);
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const msgRes = await client.entities.chat_messages.query({
        query: { session_id: sessionId },
        limit: 500,
      });
      const msgItems = msgRes.data?.items || [];
      for (const msg of msgItems) {
        await client.entities.chat_messages.delete({ id: String(msg.id) });
      }
      await client.entities.chat_sessions.delete({ id: String(sessionId) });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      toast.success("상담 기록이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const feedbackTagOptions = [
    { id: "helpful", label: "도움이 됐어요", emoji: "💡" },
    { id: "empathetic", label: "공감해줘요", emoji: "🤗" },
    { id: "practical", label: "실용적이에요", emoji: "🎯" },
    { id: "professional", label: "전문적이에요", emoji: "📚" },
    { id: "warm", label: "따뜻해요", emoji: "☀️" },
    { id: "more_detail", label: "더 구체적이면 좋겠어요", emoji: "📝" },
  ];

  const toggleTag = (tagId: string) => {
    setRatingTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleOpenRating = () => {
    if (!currentSessionId || !isLoggedIn) {
      toast.info("로그인 후 상담을 진행하면 평가할 수 있어요.");
      return;
    }
    if (hasRated) {
      toast.info("이미 이 상담에 대해 평가를 완료했어요.");
      return;
    }
    const realMessages = messages.filter((m) => m.id !== "welcome" && m.id !== "topic-welcome");
    if (realMessages.length < 2) {
      toast.info("상담을 조금 더 진행한 후 평가해주세요.");
      return;
    }
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (ratingValue === 0) {
      toast.error("별점을 선택해주세요.");
      return;
    }
    if (!currentSessionId) return;

    setIsSubmittingRating(true);
    try {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await client.entities.chat_ratings.create({
        data: {
          session_id: currentSessionId,
          rating: ratingValue,
          feedback_tags: ratingTags.join(","),
          comment: ratingComment.trim(),
          created_at: now,
        },
      });
      setHasRated(true);
      setShowRatingModal(false);
      toast.success("소중한 피드백 감사합니다! 💕");
    } catch {
      toast.error("평가 저장에 실패했습니다.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Check if current session already has a rating
  useEffect(() => {
    if (currentSessionId && isLoggedIn) {
      checkExistingRating(currentSessionId);
    }
  }, [currentSessionId, isLoggedIn]);

  const checkExistingRating = async (sessionId: number) => {
    try {
      const res = await client.entities.chat_ratings.query({
        query: { session_id: sessionId },
        limit: 1,
      });
      const items = res.data?.items || [];
      setHasRated(items.length > 0);
      if (items.length > 0) {
        setRatingValue(items[0].rating || 0);
      }
    } catch {
      // Non-critical
    }
  };

  const ratingLabels = ["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요!"];

  const currentSuggestions = selectedTopic?.suggestions || [];
  const showSuggestions = selectedTopic && messages.filter((m) => m.id !== "welcome" && m.id !== "topic-welcome").length === 0 && !isStreaming;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            {isLoggedIn && (
              <button
                onClick={() => { setShowSessionList(!showSessionList); loadSessions(); }}
                className="p-2 rounded-full hover:bg-secondary transition-colors relative"
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                {sessions.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                    {sessions.length}
                  </span>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">AI 코치</span>
            {selectedTopic && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary text-accent text-[9px] font-bold rounded-full`}>
                {selectedTopic.emoji} {selectedTopic.label}
              </span>
            )}
            {!selectedTopic && latestDiagnosis && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary text-accent text-[9px] font-bold rounded-full">
                <Sparkles className="w-2.5 h-2.5" />
                맞춤
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {isLoggedIn && currentSessionId && (
              <button
                onClick={handleOpenRating}
                className={`p-2 rounded-full hover:bg-secondary transition-colors ${hasRated ? "text-amber-500" : "text-muted-foreground"}`}
                title="상담 만족도 평가"
              >
                <Star className={`w-4 h-4 ${hasRated ? "fill-amber-400" : ""}`} />
              </button>
            )}
            {isLoggedIn && (
              <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Session List Sidebar */}
      {showSessionList && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowSessionList(false)} />
          <div className="fixed top-14 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl border-r border-gray-100 overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">상담 기록</h3>
                <button
                  onClick={() => { handleNewChat(); setShowSessionList(false); }}
                  className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold hover:text-pink-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  새 상담
                </button>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">아직 상담 기록이 없습니다</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl hover:bg-pink-50 transition-colors group ${
                      currentSessionId === session.id ? "bg-pink-50 border border-pink-200" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{session.title}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{session.last_message_preview}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(session.updated_at)}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {session.message_count}개 메시지
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Messages */}
      <main className="flex-1 pt-16 pb-24 px-4 max-w-lg mx-auto w-full overflow-y-auto">
        <div className="space-y-4 py-4">
          {/* Diagnosis Context Card */}
          {latestDiagnosis && showDiagCard && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3.5 border border-purple-100 relative">
              <button
                onClick={() => setShowDiagCard(false)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/60 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-gray-700">진단 데이터 연동됨</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-xl font-extrabold text-gray-900">{latestDiagnosis.total_score}</span>
                  <span className="text-[10px] text-gray-400">/250</span>
                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${getGradeColor(latestDiagnosis.total_score)}`}>
                    {getGradeLabel(latestDiagnosis.total_score)}
                  </div>
                </div>
                <div className="flex-1 flex flex-wrap gap-1">
                  {Object.entries(latestDiagnosis.scores).map(([cat, score]) => {
                    const info = categoryInfo[cat];
                    if (!info) return null;
                    const numScore = Number(score);
                    const isWeak = numScore < 30;
                    return (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                          isWeak ? "bg-red-50 text-red-600" : "bg-white text-gray-600"
                        }`}
                      >
                        {info.emoji} {numScore}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => navigate(`/result/${latestDiagnosis.id}`)}
                className="mt-2 text-[10px] text-purple-500 font-semibold hover:underline"
              >
                상세 리포트 보기 →
              </button>
            </div>
          )}

          {latestDiagnosis && !showDiagCard && (
            <button
              onClick={() => setShowDiagCard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full text-[10px] text-purple-600 font-medium mx-auto hover:bg-purple-100 transition-colors"
            >
              <BarChart3 className="w-3 h-3" />
              진단 데이터 연동 중 ({latestDiagnosis.total_score}/250)
              <ChevronDown className="w-3 h-3 rotate-180" />
            </button>
          )}

          {/* Current session indicator */}
          {currentSessionId && isLoggedIn && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-green-600 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              대화 자동 저장 중
            </div>
          )}

          {/* Chat Messages */}
          {diagLoading ? (
            <div className="text-center py-10">
              <Bot className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">준비 중...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    msg.role === "assistant"
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-card shadow-sm border border-border text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === "assistant" && isStreaming && msg.content && msg.id !== "welcome" && msg.id !== "topic-welcome" && (
                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              </div>
            ))
          )}

          {/* Topic Category Picker */}
          {showTopicPicker && !diagLoading && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-pink-500" />
                <p className="text-xs text-gray-600 font-semibold">상담 주제를 선택해주세요</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {topicCategories.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 ${topic.borderColor} ${topic.bgColor} hover:shadow-md hover:scale-[1.02] transition-all text-left`}
                  >
                    <span className="text-xl mb-1">{topic.emoji}</span>
                    <span className={`text-xs font-bold ${topic.color}`}>{topic.label}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">{topic.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Topic Badge + Change */}
          {selectedTopic && !showTopicPicker && (
            <div className="flex items-center justify-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${selectedTopic.bgColor} ${selectedTopic.color} border ${selectedTopic.borderColor}`}>
                {selectedTopic.emoji} {selectedTopic.label}
              </span>
              <button
                onClick={handleChangeTopic}
                className="text-[10px] text-gray-400 hover:text-pink-500 transition-colors underline"
              >
                주제 변경
              </button>
            </div>
          )}

          {/* Suggestion Chips */}
          {showSuggestions && currentSuggestions.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="text-[10px] text-gray-400 font-medium text-center">💡 추천 질문</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {currentSuggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.message)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white rounded-full border border-pink-100 text-xs font-medium text-gray-700 hover:bg-pink-50 hover:border-pink-200 transition-all shadow-sm"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rating Prompt - shows after 4+ real messages */}
          {isLoggedIn && currentSessionId && !hasRated && !isStreaming &&
            messages.filter((m) => m.id !== "welcome" && m.id !== "topic-welcome").length >= 4 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={handleOpenRating}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700 hover:shadow-md hover:scale-[1.02] transition-all"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                이 상담은 어떠셨나요? 평가해주세요
              </button>
            </div>
          )}

          {/* Already rated badge */}
          {hasRated && currentSessionId && (
            <div className="flex justify-center mt-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-[10px] text-green-600 font-medium">
                <ThumbsUp className="w-3 h-3" />
                평가 완료 ({ratingLabels[ratingValue] || ""})
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Rating Modal */}
      {showRatingModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowRatingModal(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-5 text-center">
              <button
                onClick={() => setShowRatingModal(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-base">상담은 어떠셨나요?</h3>
              <p className="text-white/80 text-xs mt-1">소중한 피드백이 서비스 개선에 도움이 됩니다</p>
            </div>

            {/* Star Rating */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="p-1 transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (ratingHover || ratingValue)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm font-semibold text-gray-700 h-5">
                {ratingLabels[ratingHover || ratingValue] || "별점을 선택해주세요"}
              </p>
            </div>

            {/* Feedback Tags */}
            {ratingValue > 0 && (
              <div className="px-6 pb-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">어떤 점이 좋았나요? (선택)</p>
                <div className="flex flex-wrap gap-1.5">
                  {feedbackTagOptions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                        ratingTags.includes(tag.id)
                          ? "bg-pink-50 border-pink-300 text-pink-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {tag.emoji} {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            {ratingValue > 0 && (
              <div className="px-6 pb-4">
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="추가 의견이 있다면 자유롭게 남겨주세요 (선택)"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all bg-gray-50"
                  maxLength={500}
                />
              </div>
            )}

            {/* Submit */}
            <div className="px-6 pb-6">
              <button
                onClick={handleSubmitRating}
                disabled={ratingValue === 0 || isSubmittingRating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-40 disabled:scale-100"
              >
                {isSubmittingRating ? "제출 중..." : "평가 제출하기"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-3">
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedTopic
                ? `${selectedTopic.emoji} ${selectedTopic.label}에 대해 이야기해주세요...`
                : latestDiagnosis
                  ? "진단 결과 기반 맞춤 상담을 받아보세요..."
                  : "관계 고민을 이야기해주세요..."
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all max-h-24 bg-secondary"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}