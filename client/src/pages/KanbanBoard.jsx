import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getTasks, updateTaskStatus } from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineCalendar, HiOutlineUser } from 'react-icons/hi';

const columns = {
  todo: { title: 'To Do', color: 'border-gray-400' },
  'in-progress': { title: 'In Progress', color: 'border-yellow-400' },
  done: { title: 'Done', color: 'border-green-400' },
};

function KanbanBoard() {
  const [tasks, setTasks] = useState({ todo: [], 'in-progress': [], done: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await getTasks();
      const grouped = { todo: [], 'in-progress': [], done: [] };
      data.forEach((task) => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });
      setTasks(grouped);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = [...tasks[source.droppableId]];
    const destCol = source.droppableId === destination.droppableId
      ? sourceCol
      : [...tasks[destination.droppableId]];

    const [movedTask] = sourceCol.splice(source.index, 1);
    destCol.splice(destination.index, 0, movedTask);

    const newTasks = {
      ...tasks,
      [source.droppableId]: sourceCol,
    };
    if (source.droppableId !== destination.droppableId) {
      newTasks[destination.droppableId] = destCol;
    }

    setTasks(newTasks);

    // Update status in backend if column changed
    if (source.droppableId !== destination.droppableId) {
      try {
        await updateTaskStatus(draggableId, destination.droppableId);
        toast.success(`Task moved to ${columns[destination.droppableId].title}`);
      } catch (error) {
        toast.error('Failed to update task status');
        fetchTasks(); // Revert
      }
    }
  };

  const priorityDot = {
    low: 'bg-blue-400',
    medium: 'bg-yellow-400',
    high: 'bg-red-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban Board</h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[600px]">
          {Object.entries(columns).map(([columnId, column]) => (
            <div key={columnId} className="flex flex-col">
              {/* Column Header */}
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${column.color}`}>
                <h2 className="font-semibold text-gray-900 dark:text-white">{column.title}</h2>
                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  {tasks[columnId].length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 p-2 rounded-lg transition-colors min-h-[200px] ${
                      snapshot.isDraggingOver
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'bg-gray-100 dark:bg-gray-800/50'
                    }`}
                  >
                    {tasks[columnId].map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                            }`}
                          >
                            {/* Priority dot + Title */}
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-2 ${priorityDot[task.priority]}`}></div>
                              <h3 className="font-medium text-gray-900 dark:text-white text-sm flex-1">
                                {task.title}
                              </h3>
                            </div>

                            {/* Meta info */}
                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <HiOutlineUser className="w-3 h-3" />
                                <span>{task.assignedTo?.name || 'Unassigned'}</span>
                              </div>
                              {task.dueDate && (
                                <div className={`flex items-center gap-1 ${
                                  new Date(task.dueDate) < new Date() && task.status !== 'done'
                                    ? 'text-red-500'
                                    : ''
                                }`}>
                                  <HiOutlineCalendar className="w-3 h-3" />
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Project tag */}
                            {task.project?.title && (
                              <div className="mt-2">
                                <span className="text-xs px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded">
                                  {task.project.title}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default KanbanBoard;
