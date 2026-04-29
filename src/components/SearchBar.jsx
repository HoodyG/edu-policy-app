import { useState } from 'react';

const SearchBar = ({ onSearch, isMobile = false, showTopTitle = false }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleBackHome = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div style={{ width: '100%' }}>
      {showTopTitle && (
        <div
          style={{
            marginBottom: '10px',
            fontSize: isMobile ? '22px' : '22px',
            fontWeight: 700,
            color: '#c41e3a',
            letterSpacing: '0.08em',
            fontFamily: '"Noto Serif SC", serif'
          }}
        >
          教育时政
        </div>
      )}
      <form className="flex gap-2 w-full" onSubmit={handleSubmit} style={{ alignItems: 'stretch' }}>
        <input
          type="text"
          placeholder="搜索教育时政新闻..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ minWidth: 0 }}
        />
        <button type="submit" className="px-6 py-3 bg-red-600 text-white rounded-2xl cursor-pointer text-lg transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">搜索</button>
        {searchTerm && (
          <button 
            type="button" 
            onClick={handleBackHome}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-2xl cursor-pointer text-lg transition-all hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            返回主页
          </button>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
