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

const getMobileActionStyle = (overrides = {}) => ({
  width: '42px',
  minWidth: '42px',
  maxWidth: '42px',
  height: '42px',
  minHeight: '42px',
  maxHeight: '42px',
  aspectRatio: '1 / 1',
  padding: 0,
  justifyContent: 'center',
  gap: 0,
  flex: '0 0 auto',
  ...overrides
});

const LeftFloatingActions = ({
  isMobile,
  fullScreenNews,
  handleOpenCardEditor,
  handleDeleteCustomCard,
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
  RefreshIcon,
  TrashIcon
}) => (
  <div
    style={{
      position: 'fixed',
      left: isMobile ? '8px' : '26px',
      bottom: isMobile ? '16px' : '64px',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '8px' : '10px',
      zIndex: 1002
    }}
  >
    {fullScreenNews.source === '自定义' && (
      <>
        <button
          type="button"
          onClick={handleOpenCardEditor}
          style={{
            ...floatingActionStyle,
            ...(isMobile ? getMobileActionStyle() : { flex: '0 0 auto' }),
            justifyContent: 'center',
            borderColor: '#ddd6fe',
            background: '#f5f3ff',
            color: '#7c3aed',
            gap: '10px'
          }}
          title="编辑卡片"
          aria-label="编辑卡片"
        >
          <EditIcon size={isMobile ? 18 : 20} color="#7c3aed" />
          {!isMobile && '编辑卡片'}
        </button>
        <button
          type="button"
          onClick={handleDeleteCustomCard}
          style={{
            ...floatingActionStyle,
            ...(isMobile ? getMobileActionStyle() : { flex: '0 0 auto' }),
            justifyContent: 'center',
            borderColor: '#fecaca',
            background: '#fff5f5',
            color: '#dc2626',
            gap: '10px'
          }}
          title="删除卡片"
          aria-label="删除卡片"
        >
          <TrashIcon size={isMobile ? 18 : 20} color="#dc2626" />
          {!isMobile && '删除卡片'}
        </button>
      </>
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
        ...(isMobile ? getMobileActionStyle() : { flex: '0 0 auto' }),
        justifyContent: 'center',
        borderColor: '#f3d8dd',
        background: '#fff7f8',
        color: '#c41e3a',
        gap: '10px'
      }}
      title={hasNote ? '编辑笔记' : '添加笔记'}
      aria-label={hasNote ? '编辑笔记' : '添加笔记'}
    >
      <NoteIcon size={isMobile ? 18 : 20} color="#c41e3a" />
      {!isMobile && (hasNote ? '编辑笔记' : '添加笔记')}
    </button>
    <button
      type="button"
      onClick={() => handleOpenQuestionEditor(null)}
      title="添加题目"
      style={{
        ...floatingActionStyle,
        ...(isMobile ? getMobileActionStyle() : { flex: '0 0 auto' }),
        justifyContent: 'center',
        borderColor: '#bfdbfe',
        background: '#eff6ff',
        color: '#1d4ed8',
        gap: '10px'
      }}
      aria-label="添加题目"
    >
      <PlusIcon size={isMobile ? 18 : 20} color="#1d4ed8" />
      {!isMobile && '添加题目'}
    </button>
    <button
      type="button"
      onClick={handleRetryAllQuestions}
      title="一键重做本卡题目"
      style={{
        width: isMobile ? '42px' : '50px',
        minWidth: isMobile ? '42px' : '50px',
        maxWidth: isMobile ? '42px' : '50px',
        height: isMobile ? '42px' : '50px',
        minHeight: isMobile ? '42px' : '50px',
        maxHeight: isMobile ? '42px' : '50px',
        aspectRatio: '1 / 1',
        borderRadius: '999px',
        border: '1px solid #d0d7e2',
        background: '#fff',
        padding: 0,
        boxSizing: 'border-box',
        color: '#475569',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        boxShadow: '0 12px 24px rgba(15,23,42,0.12)'
      }}
      aria-label="一键重做本卡题目"
    >
      <RefreshIcon size={isMobile ? 18 : 22} color="#475569" />
    </button>
  </div>
);

export default LeftFloatingActions;
