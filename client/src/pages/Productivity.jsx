import { useState, useEffect } from 'react';
import { getProductivity } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineTrendingUp,
  HiOutlineBell,
} from 'react-icons/hi';

function Productivity() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductivity();
  }, []);

  const fetchProductivity = async () => {
    try {
      const { data: prodData } = await getProductivity();
      setData(prodData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Productivity Dashboard
      </h1>

      {/* Score Card */}
      <div className="card text-center">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Your Productivity Score
        </h2>
        <div className="relative inline-flex items-center justify-center w-40 h-40">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80" cy="80" r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="80" cy="80" r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={440}
              strokeDashoffset={440 - (440 * (data?.productivityScore || 0)) / 100}
              strokeLinecap="round"
              className={getScoreColor(data?.productivityScore || 0)}
            />
          </svg>
          <span className={`absolute text-4xl font-bold ${getScoreColor(data?.productivityScore || 0)}`}>
            {data?.productivityScore || 0}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Based on completion rate and deadlines
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <HiOutlineClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {data?.totalAssigned || 0}
            </p>
            <p className="text-sm text-gray-500">Total Assigned</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <HiOutlineCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {data?.totalCompleted || 0}
            </p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <HiOutlineTrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {data?.onTimeRate || 0}%
            </p>
            <p className="text-sm text-gray-500">On-Time Rate</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <HiOutlineExclamation className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {data?.totalOverdue || 0}
            </p>
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
        </div>
      </div>

      {/* Deadline Reminders */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <HiOutlineBell className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Deadlines (Next 3 Days)
          </h2>
        </div>
        {data?.upcomingDeadlines?.length > 0 ? (
          <div className="space-y-3">
            {data.upcomingDeadlines.map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.project?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days left
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No upcoming deadlines. You're all caught up!
          </p>
        )}
      </div>
    </div>
  );
}

export default Productivity;
