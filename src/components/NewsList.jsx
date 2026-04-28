import { Link } from 'react-router-dom';

const getSourceDisplay = (item) => {
  if (item.source === '自定义') {
    return '自定义卡片';
  }

  if (item.verifiedSourceUrl || item.sourceVerified === true) {
    return item.source || '官方原文';
  }

  return '整理摘要';
};

const NewsList = ({ news }) => {
  if (news.length === 0) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl col-span-full">没有找到相关新闻</div>;
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {news.map(item => (
        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-gray-700">
          <Link to={`/news/${item.id}`} className="text-decoration-none text-gray-800 dark:text-gray-200 block">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-500 mb-4 line-clamp-2 transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400 flex-1 mr-2">{item.title}</h3>
              <span className="flex items-center gap-1 text-red-500 font-medium animate-pulse">
                🔥 {item.hotness}
              </span>
            </div>
            <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-wrap">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:bg-blue-600">{item.category}</span>
              <span className="text-gray-500 dark:text-gray-400">{item.date}</span>
              <span className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200">{getSourceDisplay(item)}</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 line-height-1.5 line-clamp-3">{item.content.substring(0, 120)}...</p>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default NewsList;
