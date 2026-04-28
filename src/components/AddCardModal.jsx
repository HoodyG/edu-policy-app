const AddCardModal = ({
  isOpen,
  isMobile,
  onClose,
  popupTitleStyle,
  formLabelStyle,
  formFieldStyle,
  ghostButtonStyle,
  primaryButtonStyle,
  newCard,
  setNewCard,
  importStatus,
  duplicateNews,
  handleImportCard,
  isImportingCard,
  handleSaveCard
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15,23,42,0.28)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '12px' : '20px'
      }}
      onClick={onClose}
    >
      <div
        className="soft-scrollbar"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(18px)',
          borderRadius: '18px',
          border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 18px 44px rgba(15,23,42,0.16)',
          padding: isMobile ? '18px' : '20px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: isMobile ? 'calc(100vh - 40px)' : '80vh',
          overflowY: 'auto',
          fontFamily: 'inherit'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <h3 style={popupTitleStyle}>添加自定义卡片</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={formLabelStyle}>原文链接</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
              <input
                type="url"
                value={newCard.sourceUrl}
                onChange={(event) => {
                  setNewCard({ ...newCard, sourceUrl: event.target.value });
                }}
                onBlur={() => {
                  if (newCard.sourceUrl.trim()) {
                    handleImportCard(false);
                  }
                }}
                placeholder="先贴原文链接，系统会自动抓取正文"
                style={{
                  ...formFieldStyle,
                  flex: 1
                }}
              />
              <button
                type="button"
                onClick={() => handleImportCard(true)}
                disabled={isImportingCard}
                style={{
                  ...primaryButtonStyle,
                  padding: '0 16px',
                  minWidth: '96px',
                  background: isImportingCard ? '#cbd5e1' : '#2563eb',
                  cursor: isImportingCard ? 'not-allowed' : 'pointer'
                }}
              >
                {isImportingCard ? '抓取中' : '抓取正文'}
              </button>
            </div>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '12px',
                lineHeight: 1.7,
                color:
                  duplicateNews || importStatus.includes('失败') || importStatus.includes('请输入')
                    ? '#dc2626'
                    : '#64748b'
              }}
            >
              {importStatus || '支持先贴网页链接，自动整理标题、摘要和正文；抓不到时也可以继续手动编辑。'}
            </p>
          </div>

          {duplicateNews && (
            <div
              style={{
                marginTop: '-4px',
                padding: '12px 14px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '14px',
                fontSize: '13px',
                lineHeight: 1.7,
                color: '#9f1239',
                fontFamily: 'inherit'
              }}
            >
              已有同链接卡片：{duplicateNews.title}（{duplicateNews.date}）
            </div>
          )}

          <div>
            <label style={formLabelStyle}>标题</label>
            <input
              type="text"
              value={newCard.title}
              onChange={(event) => setNewCard({ ...newCard, title: event.target.value })}
              placeholder="抓取后会自动填入，也可以手动修改"
              style={formFieldStyle}
            />
          </div>

          <div>
            <label style={formLabelStyle}>日期</label>
            <input
              type="date"
              lang="zh-CN"
              inputMode="none"
              value={newCard.date}
              onChange={(event) => setNewCard({ ...newCard, date: event.target.value })}
              style={formFieldStyle}
            />
          </div>

          <div>
            <label style={formLabelStyle}>卡片摘要</label>
            <textarea
              value={newCard.summary || newCard.content}
              onChange={(event) =>
                setNewCard({
                  ...newCard,
                  content: event.target.value,
                  summary: event.target.value
                })
              }
              placeholder="这里显示首页卡片摘要，可继续手动修改"
              style={{
                ...formFieldStyle,
                minHeight: '96px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={formLabelStyle}>整理正文</label>
            <textarea
              value={newCard.detailContent}
              onChange={(event) => setNewCard({ ...newCard, detailContent: event.target.value })}
              placeholder="这里显示抓取后整理出的完整正文，用户可以继续编辑"
              style={{
                ...formFieldStyle,
                minHeight: '220px',
                lineHeight: 1.8,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={ghostButtonStyle}>
              取消
            </button>
            <button
              onClick={handleSaveCard}
              disabled={isImportingCard || !newCard.title.trim() || Boolean(duplicateNews)}
              style={{
                ...primaryButtonStyle,
                background:
                  isImportingCard || !newCard.title.trim() || duplicateNews ? '#9ca3af' : '#4caf50',
                cursor:
                  isImportingCard || !newCard.title.trim() || duplicateNews ? 'not-allowed' : 'pointer'
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCardModal;
