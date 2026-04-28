const QuestionPracticeHeader = ({
  isMobile,
  currentQuestionsLength,
  currentArticleStats,
  currentQuestionEntry,
  isSortMenuOpen,
  onToggleSortMenu,
  onSetSortMode,
  onOpenSortManager,
  SortIcon
}) => (
  <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: currentQuestionsLength > 0 ? '14px' : 0
  }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>题目练习</h3>
      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>
        支持整段粘贴题目，自动识别题干、选项、答案和解析。选择后立即判题。
      </p>
      {currentArticleStats.attempts > 0 && (
        <div style={{
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#f0fdf4',
            color: '#15803d',
            fontSize: '12px',
            border: '1px solid #dcfce7'
          }}>
            累计正确率 {currentArticleStats.attempts > 0 ? Math.round((currentArticleStats.correct / currentArticleStats.attempts) * 100) : 0}%
          </span>
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#f8fafc',
            color: '#64748b',
            fontSize: '12px',
            border: '1px solid #e2e8f0'
          }}>
            累计作答 {currentArticleStats.attempts} 次
          </span>
        </div>
      )}
    </div>

    {currentQuestionsLength > 0 && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative' }} data-popup-layer="true">
          <button
            type="button"
            onClick={onToggleSortMenu}
            title={`当前${currentQuestionEntry.sortMode === 'asc' ? '正序' : '倒序'}`}
            style={{
              padding: '8px 14px',
              borderRadius: '999px',
              border: '1px solid #d0d7e2',
              background: '#fff',
              color: '#475569',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <SortIcon size={15} />
            {currentQuestionEntry.sortMode === 'asc' ? '正序' : '倒序'}
          </button>
          {isSortMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              minWidth: '124px',
              padding: '8px',
              borderRadius: '12px',
              border: '1px solid #dbe4ef',
              background: '#fff',
              boxShadow: '0 16px 32px rgba(15,23,42,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 20
            }}>
              <button type="button" onClick={() => onSetSortMode('desc')} style={{ padding: '8px 10px', borderRadius: '10px', border: 'none', background: currentQuestionEntry.sortMode === 'desc' ? '#eff6ff' : '#fff', color: currentQuestionEntry.sortMode === 'desc' ? '#1d4ed8' : '#475569', textAlign: 'left', cursor: 'pointer' }}>倒序</button>
              <button type="button" onClick={() => onSetSortMode('asc')} style={{ padding: '8px 10px', borderRadius: '10px', border: 'none', background: currentQuestionEntry.sortMode === 'asc' ? '#eff6ff' : '#fff', color: currentQuestionEntry.sortMode === 'asc' ? '#1d4ed8' : '#475569', textAlign: 'left', cursor: 'pointer' }}>正序</button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenSortManager}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: currentQuestionEntry.sortMode === 'custom' ? '1px solid #2563eb' : '1px solid #d0d7e2',
            background: currentQuestionEntry.sortMode === 'custom' ? '#eff6ff' : '#fff',
            color: currentQuestionEntry.sortMode === 'custom' ? '#1d4ed8' : '#475569',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          自定义排序
        </button>
      </div>
    )}
  </div>
);

export default QuestionPracticeHeader;
