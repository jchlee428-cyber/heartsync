import { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Server,
  Monitor,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { createClient } from '@metagptx/web-sdk';
import { toast } from 'sonner';

const client = createClient();

interface EnvVariable {
  key: string;
  value: string;
  description: string;
}

interface EnvConfig {
  backend_vars: Record<string, EnvVariable>;
  frontend_vars: Record<string, EnvVariable>;
}

interface EditingVar {
  key: string;
  value: string;
  type: 'backend' | 'frontend';
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<EnvConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [editingVar, setEditingVar] = useState<EditingVar | null>(null);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newVarType, setNewVarType] = useState<'backend' | 'frontend'>('backend');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/settings',
        method: 'GET',
        data: {},
      });
      if (res.data) {
        setConfig(res.data as EnvConfig);
      } else {
        setError('설정 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('설정을 불러오는데 실패했습니다. 관리자 권한을 확인해주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isSensitiveKey = (key: string) => {
    const sensitivePatterns = [
      'SECRET',
      'PASSWORD',
      'KEY',
      'TOKEN',
      'CREDENTIAL',
      'DATABASE_URL',
    ];
    return sensitivePatterns.some((p) => key.toUpperCase().includes(p));
  };

  const maskValue = (value: string) => {
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  };

  const handleEdit = (key: string, value: string, type: 'backend' | 'frontend') => {
    setEditingVar({ key, value, type });
  };

  const handleSaveEdit = async () => {
    if (!editingVar) return;
    setSaving(true);
    try {
      await client.apiCall.invoke({
        url: `/api/v1/admin/settings/${editingVar.type}/${editingVar.key}`,
        method: 'PUT',
        data: { value: editingVar.value },
      });
      toast.success(`${editingVar.key} 설정이 업데이트되었습니다.`);
      setEditingVar(null);
      await loadConfig();
    } catch {
      toast.error('설정 업데이트에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newVarKey.trim() || !newVarValue.trim()) {
      toast.error('키와 값을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await client.apiCall.invoke({
        url: `/api/v1/admin/settings/${newVarType}/${newVarKey.trim()}`,
        method: 'POST',
        data: { value: newVarValue.trim() },
      });
      toast.success(`${newVarKey} 설정이 추가되었습니다.`);
      setNewVarKey('');
      setNewVarValue('');
      setShowAddForm(false);
      await loadConfig();
    } catch {
      toast.error('설정 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string, type: 'backend' | 'frontend') => {
    if (!confirm(`정말 "${key}" 설정을 삭제하시겠습니까?`)) return;
    try {
      await client.apiCall.invoke({
        url: `/api/v1/admin/settings/${type}/${key}`,
        method: 'DELETE',
        data: {},
      });
      toast.success(`${key} 설정이 삭제되었습니다.`);
      await loadConfig();
    } catch {
      toast.error('설정 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">설정 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadConfig}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const backendVars = config?.backend_vars
    ? Object.values(config.backend_vars)
    : [];
  const frontendVars = config?.frontend_vars
    ? Object.values(config.frontend_vars)
    : [];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">설정 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            환경변수를 관리합니다. 변경 후 서버 재시작이 필요할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConfig}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            변수 추가
          </button>
        </div>
      </div>

      {/* Add new variable form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            새 환경변수 추가
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                타입
              </label>
              <select
                value={newVarType}
                onChange={(e) =>
                  setNewVarType(e.target.value as 'backend' | 'frontend')
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="backend">백엔드</option>
                <option value="frontend">프론트엔드</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                키
              </label>
              <input
                type="text"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                placeholder="VARIABLE_NAME"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                값
              </label>
              <input
                type="text"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder="value"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? '저장 중...' : '추가'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingVar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              설정 수정
            </h3>
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                키
              </label>
              <p className="text-sm font-mono bg-gray-50 px-3 py-2 rounded-lg text-gray-700">
                {editingVar.key}
              </p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                값
              </label>
              <input
                type="text"
                value={editingVar.value}
                onChange={(e) =>
                  setEditingVar({ ...editingVar, value: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setEditingVar(null)}
                className="px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backend Variables */}
      <EnvSection
        title="백엔드 환경변수"
        icon={Server}
        iconColor="text-orange-600"
        iconBg="bg-orange-100"
        variables={backendVars}
        type="backend"
        showValues={showValues}
        onToggleShow={toggleShowValue}
        isSensitiveKey={isSensitiveKey}
        maskValue={maskValue}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Frontend Variables */}
      <EnvSection
        title="프론트엔드 환경변수"
        icon={Monitor}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
        variables={frontendVars}
        type="frontend"
        showValues={showValues}
        onToggleShow={toggleShowValue}
        isSensitiveKey={isSensitiveKey}
        maskValue={maskValue}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

function EnvSection({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  variables,
  type,
  showValues,
  onToggleShow,
  isSensitiveKey,
  maskValue,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  variables: EnvVariable[];
  type: 'backend' | 'frontend';
  showValues: Record<string, boolean>;
  onToggleShow: (key: string) => void;
  isSensitiveKey: (key: string) => boolean;
  maskValue: (value: string) => string;
  onEdit: (key: string, value: string, type: 'backend' | 'frontend') => void;
  onDelete: (key: string, type: 'backend' | 'frontend') => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-400">{variables.length}개 변수</p>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {variables.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Settings className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">환경변수가 없습니다</p>
          </div>
        ) : (
          variables.map((v) => {
            const sensitive = isSensitiveKey(v.key);
            const isVisible = showValues[`${type}_${v.key}`];
            const displayValue =
              sensitive && !isVisible ? maskValue(v.value) : v.value;

            return (
              <div
                key={v.key}
                className="px-5 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {v.key}
                      </p>
                      {v.description && (
                        <span className="text-[10px] text-gray-400 hidden sm:inline">
                          {v.description}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-gray-500 break-all">
                      {displayValue}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {sensitive && (
                      <button
                        onClick={() => onToggleShow(`${type}_${v.key}`)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title={isVisible ? '값 숨기기' : '값 보기'}
                      >
                        {isVisible ? (
                          <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(v.key, v.value, type)}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="수정"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                    <button
                      onClick={() => onDelete(v.key, type)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}