import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Heart, Pencil, User, Users, Activity } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { socket } from './socket';
import './App.css';
import NotesEditor from './components/NotesEditor';
import ContractionCounter from './components/ContractionCounter';

const initialData = {
  tasks: {
    'task-1': { id: 'task-1', title: 'Comprar Cuna', description: 'Buscar opciones en Ikea y comparar precios', priority: 'high', tags: ['Compras', 'Cuarto'], assignee: 'ambos' },
    'task-2': { id: 'task-2', title: 'Pediatra', description: 'Agendar primera cita de control', priority: 'medium', tags: ['Médico'], assignee: 'mama' },
    'task-3': { id: 'task-3', title: 'Música relajante', description: 'Hacer playlist para el parto', priority: 'low', tags: ['Parto'], assignee: 'papa' },
  },
  columns: {
    'col-todo': {
      id: 'col-todo',
      title: '📝 Por Hacer',
      taskIds: ['task-1', 'task-2', 'task-3'],
    },
    'col-inprogress': {
      id: 'col-inprogress',
      title: '⏳ En Progreso',
      taskIds: [],
    },
    'col-done': {
      id: 'col-done',
      title: '✅ Listo',
      taskIds: [],
    },
  },
  columnOrder: ['col-todo', 'col-inprogress', 'col-done'],
};

function App() {
  const [data, setData] = useState(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    fetch('/api/state/kanban')
      .then(res => res.json())
      .then(saved => {
        if (saved) {
          isRemoteUpdate.current = true;
          setData(saved);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error("Error loading kanban state", err);
        setIsLoaded(true);
      });
      
    const handleStateUpdate = (update) => {
      if (update.key === 'kanban') {
        isRemoteUpdate.current = true;
        setData(update.value);
      }
    };
    
    socket.on('state-updated', handleStateUpdate);
    return () => socket.off('state-updated', handleStateUpdate);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('cassandra_active_tab') || 'board';
  });

  useEffect(() => {
    localStorage.setItem('cassandra_active_tab', activeTab);
  }, [activeTab]);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    tags: '',
    assignee: 'ambos'
  });
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    
    // Save locally via API and broadcast via Socket
    fetch('/api/state/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error("Error saving kanban state", err));
    
  }, [data, isLoaded]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Moving within the same column
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        taskIds: newTaskIds,
      };

      setData({
        ...data,
        columns: {
          ...data.columns,
          [newColumn.id]: newColumn,
        },
      });
      return;
    }

    // Moving from one column to another
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...startColumn,
      taskIds: startTaskIds,
    };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finishColumn,
      taskIds: finishTaskIds,
    };

    setData({
      ...data,
      columns: {
        ...data.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    });
  };

  const openModal = (columnId) => {
    setActiveColumnId(columnId);
    setEditingTaskId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task, columnId) => {
    setActiveColumnId(columnId);
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      tags: task.tags ? task.tags.join(', ') : '',
      assignee: task.assignee || 'ambos'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTask({ title: '', description: '', priority: 'medium', tags: '', assignee: 'ambos' });
    setActiveColumnId(null);
    setEditingTaskId(null);
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const tagsArray = newTask.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    if (editingTaskId) {
      // Editar tarea existente
      const updatedTask = {
        ...data.tasks[editingTaskId],
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        tags: tagsArray,
        assignee: newTask.assignee,
      };

      setData({
        ...data,
        tasks: {
          ...data.tasks,
          [editingTaskId]: updatedTask,
        }
      });
    } else {
      // Crear nueva tarea
      const newTaskId = `task-${uuidv4()}`;
      const task = {
        id: newTaskId,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        tags: tagsArray,
        assignee: newTask.assignee,
      };

      const column = data.columns[activeColumnId];
      const newTaskIds = Array.from(column.taskIds);
      newTaskIds.push(newTaskId);

      setData({
        ...data,
        tasks: {
          ...data.tasks,
          [newTaskId]: task,
        },
        columns: {
          ...data.columns,
          [activeColumnId]: {
            ...column,
            taskIds: newTaskIds,
          },
        },
      });
    }

    closeModal();
  };

  const handleDeleteTask = (taskId, columnId) => {
    const column = data.columns[columnId];
    const newTaskIds = column.taskIds.filter(id => id !== taskId);
    
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];

    setData({
      ...data,
      tasks: newTasks,
      columns: {
        ...data.columns,
        [columnId]: {
          ...column,
          taskIds: newTaskIds
        }
      }
    });
  };

  if (!isLoaded) {
    return (
      <div className="app-container">
        <header className="header">
          <h1>Cassadrapp <Heart className="inline-block text-pink-400" size={32} color="#fb7185" fill="#fb7185" /></h1>
          <p>Cargando datos...</p>
        </header>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Cassadrapp <Heart className="inline-block text-pink-400" size={32} color="#fb7185" fill="#fb7185" /></h1>
        <p>Nuestro espacio para preparar la llegada de nuestra bebé</p>
        
        <nav className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            Tablero Kanban
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notas
          </button>
          <button 
            className={`tab-btn ${activeTab === 'contractions' ? 'active' : ''}`}
            onClick={() => setActiveTab('contractions')}
          >
            <Activity size={16} /> Contracciones
          </button>
        </nav>
      </header>

      {activeTab === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
        <div className="board">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

            return (
              <div key={column.id} className="column">
                <div className="column-header">
                  <h2>{column.title} <span className="task-count">{tasks.length}</span></h2>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      className="task-list"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              className="task-card"
                              data-priority={task.priority}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="task-title">
                                {task.title}
                                <div className="task-actions">
                                  <button 
                                    className="task-action-btn" 
                                    onClick={() => openEditModal(task, column.id)}
                                    title="Editar tarea"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button 
                                    className="task-action-btn delete" 
                                    onClick={() => handleDeleteTask(task.id, column.id)}
                                    title="Eliminar tarea"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              {task.description && (
                                <div className="task-desc">{task.description}</div>
                              )}
                              
                              <div className="task-footer">
                                <div className="task-tags">
                                  {task.tags && task.tags.map((tag, i) => (
                                    <span key={i} className="tag">{tag}</span>
                                  ))}
                                </div>
                                <div className={`task-assignee ${task.assignee || 'ambos'}`}>
                                  {(!task.assignee || task.assignee === 'ambos') && <><Users size={12}/> Ambos</>}
                                  {task.assignee === 'papa' && <><User size={12}/> Papá</>}
                                  {task.assignee === 'mama' && <><User size={12}/> Mamá</>}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <button className="add-task-btn" onClick={() => openModal(column.id)}>
                  <Plus size={18} /> Añadir Tarea
                </button>
              </div>
            );
          })}
        </div>
        </DragDropContext>
      ) : activeTab === 'notes' ? (
        <NotesEditor />
      ) : (
        <ContractionCounter />
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTaskId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Título</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})} 
                  placeholder="Ej. Comprar pañales"
                  required 
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea 
                  className="form-textarea" 
                  value={newTask.description} 
                  onChange={e => setNewTask({...newTask, description: e.target.value})} 
                  placeholder="Detalles adicionales..."
                />
              </div>
              <div className="form-group">
                <label>Prioridad</label>
                <select 
                  className="form-select" 
                  value={newTask.priority} 
                  onChange={e => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="high">🔴 Alta (Urgente)</option>
                  <option value="medium">🟡 Media</option>
                  <option value="low">🟢 Baja</option>
                </select>
              </div>
              <div className="form-group">
                <label>Responsable</label>
                <select 
                  className="form-select" 
                  value={newTask.assignee} 
                  onChange={e => setNewTask({...newTask, assignee: e.target.value})}
                >
                  <option value="ambos">🤝 Ambos</option>
                  <option value="papa">🧔 Papá</option>
                  <option value="mama">👩 Mamá</option>
                </select>
              </div>
              <div className="form-group">
                <label>Etiquetas (separadas por coma)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newTask.tags} 
                  onChange={e => setNewTask({...newTask, tags: e.target.value})} 
                  placeholder="Ej. Compras, Cuarto, Farmacia"
                />
              </div>
              <button type="submit" className="btn-primary">Guardar Tarea</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
