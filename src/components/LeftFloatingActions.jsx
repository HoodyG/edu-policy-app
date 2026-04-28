const floatingActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 18px',
  borderRadius: '999px',
  border: '1px solid #d6dde8',
  background: '#ffffff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: '14px',
  boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
  textDecoration: 'none'
};

const LeftFloatingActions = ({
  isMobile,
  fullScreenNews,
  handleOpenCardEditor,
  hasNote,
  setIsQuestionEditing,
  setEditingQuestionId,
  setIsSortManagerOpen,
  setIsNoteEditing,
  handleOpenQuestionEditor,
  handleRetryAllQuestions,
  EditIcon,
  NoteIcon,
  PlusIcon,
  RefreshIcon
}) => (
  <div
    style={{
      position: 'fixed',
      left: isMobile ? '18px' : '26px',
      bottom: isMobile ? '94px' : '64px',
      display: 'flex',
      gap: '10px',
      zIndex: 1002
    }}
  >
    {fullScreenNews.source === '自定义' && (
      <button
        type="button"
        onClick={handleOpenCardEditor}
        style={{
          ...floatingActionStyle,
          borderColor: '#ddd6fe',
          background: '#f5f3ff',
          color: '#7c3aed',
          gap: '10px'
        }}
      >
        <EditIcon size={20} color="#7c3aed" />
        编辑卡片
      </button>
    )}
    <button
      type="button"
      onClick={() => {
        setIsQuestionEditing(false);
        setEditingQuestionId('');
        setIsSortManagerOpen(false);
        setIsNoteEditing(true);
      }}
      style={{
        ...floatingActionStyle,
        borderColor: '#f3d8dd',
        background: '#fff7f8',
        color: '#c41e3a',
        gap: '10px'
      }}
    >
      <NoteIcon size={20} color="#c41e3a" />
      {hasNote ? '编辑笔记' : '添加笔记'}
    </button>
    <button
      type="button"
      onClick={() => handleOpenQuestionEditor(null)}
      title="添加题目"
      style={{
        ...floatingActionStyle,
        borderColor: '#bfdbfe',
        background: '#eff6ff',
        color: '#1d4ed8',
        gap: '10px'
      }}
    >
      <PlusIcon size={20} color="#1d4ed8" />
      添加题目
    </button>
    <button
      type="button"
      onClick={handleRetryAllQuestions}
      title="一键重做本卡题目"
      style={{
        width: isMobile ? '48px' : '50px',
        height: isMobile ? '48px' : '50px',
        borderRadius: '999px',
        border: '1px solid #d0d7e2',
        background: '#fff',
        color: '#475569',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 12px 24px rgba(15,23,42,0.12)'
      }}
    >
      <RefreshIcon size={22} color="#475569" />
    </button>
  </div>
);

export default LeftFloatingActions;
