import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Users, Activity, AlertCircle, Shield, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { socket } from '../socket';
import './Calendar.css';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // defaults to Jul 1, 2026
  const [shifts, setShifts] = useState({}); // { "2026-07-15": ["doc-id-1"] }
  const [doctors, setDoctors] = useState({}); // { "doc-id-1": { id, name, color } }
  const [contractions, setContractions] = useState({ history: [] });
  const [events, setEvents] = useState({}); // { "2026-07-15": [{ id, text, type }] }
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newDoc, setNewDoc] = useState({ name: '', color: '#3b82f6' });
  const [selectedDocForShift, setSelectedDocForShift] = useState('');
  const [newEvent, setNewEvent] = useState({ text: '', type: 'info' });
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'day', '3days', 'week', 'month'

  const isRemoteUpdateShifts = useRef(false);
  const isRemoteUpdateDocs = useRef(false);
  const isRemoteUpdateEvents = useRef(false);

  useEffect(() => {
    const today = new Date();
    // Start at today's date for daily/weekly views, not just 1st of month
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

    Promise.all([
      fetch('/api/state/calendar').then(res => res.json()),
      fetch('/api/state/doctors').then(res => res.json()),
      fetch('/api/state/contractions').then(res => res.json()),
      fetch('/api/state/events').then(res => res.json())
    ]).then(([savedShifts, savedDoctors, savedContractions, savedEvents]) => {
      if (savedShifts) {
        isRemoteUpdateShifts.current = true;
        setShifts(savedShifts);
      }
      if (savedDoctors) {
        isRemoteUpdateDocs.current = true;
        setDoctors(savedDoctors);
      }
      if (savedContractions) {
        setContractions(savedContractions);
      }
      if (savedEvents) {
        isRemoteUpdateEvents.current = true;
        setEvents(savedEvents);
      }
      setIsLoaded(true);
    }).catch(err => {
      console.error("Error loading calendar/doctors/contractions/events state", err);
      setIsLoaded(true);
    });
      
    const handleStateUpdate = (update) => {
      if (update.key === 'calendar') {
        isRemoteUpdateShifts.current = true;
        setShifts(update.value);
      }
      if (update.key === 'doctors') {
        isRemoteUpdateDocs.current = true;
        setDoctors(update.value);
      }
      if (update.key === 'contractions') {
        setContractions(update.value);
      }
      if (update.key === 'events') {
        isRemoteUpdateEvents.current = true;
        setEvents(update.value);
      }
    };
    
    socket.on('state-updated', handleStateUpdate);
    return () => socket.off('state-updated', handleStateUpdate);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (isRemoteUpdateShifts.current) {
      isRemoteUpdateShifts.current = false;
      return;
    }
    fetch('/api/state/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shifts)
    }).catch(err => console.error("Error saving calendar state", err));
  }, [shifts, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isRemoteUpdateDocs.current) {
      isRemoteUpdateDocs.current = false;
      return;
    }
    fetch('/api/state/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctors)
    }).catch(err => console.error("Error saving doctors state", err));
  }, [doctors, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isRemoteUpdateEvents.current) {
      isRemoteUpdateEvents.current = false;
      return;
    }
    fetch('/api/state/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    }).catch(err => console.error("Error saving events state", err));
  }, [events, isLoaded]);


  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    if (viewMode === '3days') d.setDate(d.getDate() - 3);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    if (viewMode === '3days') d.setDate(d.getDate() + 3);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setSelectedDocForShift('');
    setNewEvent({ text: '', type: 'info' });
    setShowEventForm(false);
    setShowShiftForm(false);
  };

  const handleAddDoctor = (e) => {
    e.preventDefault();
    if (!newDoc.name.trim()) return;
    const id = uuidv4();
    setDoctors(prev => ({
      ...prev,
      [id]: { id, name: newDoc.name, color: newDoc.color }
    }));
    setNewDoc({ name: '', color: '#3b82f6' });
  };

  const handleDeleteDoctor = (id) => {
    setDoctors(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setShifts(prev => {
      const newShifts = {};
      for (const date in prev) {
        const filtered = prev[date].filter(docId => docId !== id);
        if (filtered.length > 0) newShifts[date] = filtered;
      }
      return newShifts;
    });
  };

  const handleAddShift = (e) => {
    e.preventDefault();
    if (!selectedDocForShift || !selectedDate) return;

    setShifts(prev => {
      const dayShifts = prev[selectedDate] || [];
      if (dayShifts.includes(selectedDocForShift)) return prev; 
      return {
        ...prev,
        [selectedDate]: [...dayShifts, selectedDocForShift]
      };
    });
    setSelectedDocForShift('');
    setShowShiftForm(false);
  };

  const handleDeleteShift = (docId) => {
    setShifts(prev => {
      const dayShifts = prev[selectedDate] || [];
      const updatedShifts = dayShifts.filter(id => id !== docId);
      const newShifts = { ...prev };
      if (updatedShifts.length > 0) {
        newShifts[selectedDate] = updatedShifts;
      } else {
        delete newShifts[selectedDate];
      }
      return newShifts;
    });
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEvent.text.trim() || !selectedDate) return;

    const eventData = {
      id: uuidv4(),
      text: newEvent.text,
      type: newEvent.type
    };

    setEvents(prev => {
      const dayEvents = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: [...dayEvents, eventData]
      };
    });
    setNewEvent({ text: '', type: 'info' });
    setShowEventForm(false);
  };

  const handleDeleteEvent = (id) => {
    setEvents(prev => {
      const dayEvents = prev[selectedDate] || [];
      const updatedEvents = dayEvents.filter(ev => ev.id !== id);
      const newEvents = { ...prev };
      if (updatedEvents.length > 0) {
        newEvents[selectedDate] = updatedEvents;
      } else {
        delete newEvents[selectedDate];
      }
      return newEvents;
    });
  };

  const getDatesToRender = () => {
    const dates = [];
    if (viewMode === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // force 1st day of month for calculation
      const firstDay = new Date(year, month, 1).getDay();
      for (let i = 0; i < firstDay; i++) dates.push(null);
      for (let day = 1; day <= daysInMonth; day++) dates.push(new Date(year, month, day));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - d.getDay()); // go back to Sunday
      for (let i = 0; i < 7; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (viewMode === '3days') {
      const d = new Date(currentDate);
      for (let i = 0; i < 3; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (viewMode === 'day') {
      dates.push(new Date(currentDate));
    }
    return dates;
  };

  const renderCells = () => {
    const dates = getDatesToRender();
    const today = new Date();
    
    return dates.map((dateObj, index) => {
      if (!dateObj) {
        return <div key={`empty-${index}`} className="day-cell empty"></div>;
      }

      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const prevDate = new Date(year, month, day - 1);
      const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      
      const dayShifts = shifts[dateStr] || [];
      const prevDayShifts = shifts[prevDateStr] || [];
      const dayEvents = events[dateStr] || [];
      
      const dayContractions = (contractions.history || []).filter(session => {
        const sessionDate = new Date(session.startTime);
        return `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}` === dateStr;
      });
      const totalContractions = dayContractions.reduce((sum, session) => sum + (session.contractions?.length || 0), 0);
      
      // Determine what day label to show depending on viewMode
      let dayLabel = day;
      if (viewMode !== 'month') {
        dayLabel = `${DAYS_OF_WEEK[dateObj.getDay()]} ${day}`; // e.g. "Lun 15"
      }

      return (
        <div 
          key={dateStr} 
          className={`day-cell ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(dateStr)}
        >
          <div className="day-number">{dayLabel}</div>
          <div className="shifts">
            {totalContractions > 0 && (
              <div className="shift-tag" style={{ background: 'linear-gradient(135deg, #fb7185, #e11d48)' }}>
                <Activity size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {totalContractions} Contracciones
              </div>
            )}

            {/* Eventos personalizados */}
            {dayEvents.map(ev => (
              <div 
                key={ev.id} 
                className="shift-tag" 
                style={{ 
                  background: ev.type === 'alert' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 
                              ev.type === 'warning' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                              'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                }}
              >
                {ev.text}
              </div>
            ))}
            
            {/* Guardias */}
            {dayShifts.map(docId => {
              const doc = doctors[docId];
              if (!doc) return null;
              return (
                <div key={`g-${docId}`} className="shift-tag" style={{ backgroundColor: doc.color }}>
                  {doc.name} (Guardia)
                </div>
              );
            })}
            
            {/* Post Guardias */}
            {prevDayShifts.map(docId => {
              const doc = doctors[docId];
              if (!doc) return null;
              return (
                <div key={`pg-${docId}`} className="shift-tag post-guardia" style={{ borderColor: doc.color, color: doc.color }}>
                  {doc.name} (Post Guardia)
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'day') {
      return `${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    // For week and 3-days, just showing month/year is usually fine, or you could compute a range
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }

  if (!isLoaded) {
    return <div className="guardias-module">Cargando...</div>;
  }

  const doctorsList = Object.values(doctors);

  return (
    <div className="guardias-module">
      
      {/* Sidebar: Doctors Directory */}
      {showSidebar && (
        <div className="doctors-sidebar">
          <div className="sidebar-header">
            <Users size={20} /> Directorio de Doctores
          </div>
          
          <form className="add-doc-form" onSubmit={handleAddDoctor}>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label>Nombre</label>
              <input 
                type="text" 
                className="form-input" 
                value={newDoc.name}
                onChange={e => setNewDoc({...newDoc, name: e.target.value})}
                placeholder="Dr. Apellido"
                required
              />
            </div>
            <div className="form-group color-picker" style={{ marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Color:</label>
              <input 
                type="color" 
                className="color-input" 
                value={newDoc.color}
                onChange={e => setNewDoc({...newDoc, color: e.target.value})}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ minHeight: '36px', padding: '0.5rem' }}>
              <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle' }}/> Agregar
            </button>
          </form>

          <div className="doctors-list">
            {doctorsList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                No hay doctores registrados
              </div>
            ) : (
              doctorsList.map(doc => (
                <div key={doc.id} className="doctor-item">
                  <div className="doc-info">
                    <div className="doc-color-dot" style={{ backgroundColor: doc.color }}></div>
                    <span>{doc.name}</span>
                  </div>
                  <button 
                    className="task-action-btn delete" 
                    onClick={() => handleDeleteDoctor(doc.id)}
                    title="Eliminar doctor"
                    style={{ margin: 0, padding: '0.2rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Calendar */}
      <div className="calendar-main">
        <div className="calendar-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="nav-btn" 
              onClick={() => setShowSidebar(!showSidebar)}
              title="Alternar panel de doctores"
              style={{ background: showSidebar ? 'var(--accent-color)' : 'white', color: showSidebar ? 'white' : 'var(--text-muted)' }}
            >
              <Users size={20} />
            </button>
            <h2 style={{ marginLeft: '0.5rem' }}>{getHeaderTitle()}</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 1rem', fontSize: '0.9rem', cursor: 'pointer' }}
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="day">Día</option>
              <option value="3days">3 Días</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="nav-btn" onClick={navigatePrev}><ChevronLeft /></button>
              <button className="nav-btn" onClick={navigateNext}><ChevronRight /></button>
            </div>
          </div>
        </div>

        <div className={`calendar-grid view-${viewMode}`}>
          {viewMode === 'month' && DAYS_OF_WEEK.map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
          {renderCells()}
        </div>
      </div>

      {/* Modal for Day details */}
      {isModalOpen && selectedDate && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
              <h2>Día: {selectedDate}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            {/* ACTION BUTTONS ROW */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => { setShowShiftForm(!showShiftForm); setShowEventForm(false); }} 
                className="round-action-btn" 
                style={{ background: '#8b5cf6' }}
                title="Asignar Guardia"
              >
                <Shield color="white" size={24} />
              </button>
              <button 
                onClick={() => { setShowEventForm(!showEventForm); setShowShiftForm(false); }} 
                className="round-action-btn" 
                style={{ background: '#f59e0b' }}
                title="Añadir Evento o Síntoma"
              >
                <AlertTriangle color="white" size={24} />
              </button>
            </div>

            {/* FORMS */}
            {showEventForm && (
              <form onSubmit={handleAddEvent} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#f59e0b' }}>Añadir Síntoma/Evento</h4>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newEvent.text}
                    onChange={e => setNewEvent({...newEvent, text: e.target.value})}
                    placeholder="Ej. Dolor de espalda, Mucho movimiento..."
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <select 
                    className="form-select"
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                  >
                    <option value="info">🟦 Información Normal</option>
                    <option value="warning">🟧 Atención (Ej. Dolor leve)</option>
                    <option value="alert">🟥 Alerta (Ej. Sangrado)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowEventForm(false)} style={{ padding: '0.5rem 1rem' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {showShiftForm && (
              <form onSubmit={handleAddShift} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6' }}>Asignar Guardia</h4>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  {doctorsList.length === 0 ? (
                    <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                      Primero debes registrar doctores en el panel izquierdo.
                    </div>
                  ) : (
                    <select 
                      className="form-select"
                      value={selectedDocForShift}
                      onChange={e => setSelectedDocForShift(e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Elige un doctor --</option>
                      {doctorsList.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowShiftForm(false)} style={{ padding: '0.5rem 1rem' }}>
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ background: 'var(--accent-color)', padding: '0.5rem 1rem' }}
                    disabled={doctorsList.length === 0}
                  >
                    Asignar
                  </button>
                </div>
              </form>
            )}

            {/* SECCIÓN SÍNTOMAS Y EVENTOS */}
            <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', marginBottom: '1rem', marginTop: 0 }}>
                <AlertCircle size={18} color="#f59e0b" /> Síntomas y Eventos
              </h3>
              
              <div className="shift-list" style={{ marginBottom: '1rem', marginTop: 0 }}>
                {(events[selectedDate] || []).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No hay eventos registrados.
                  </div>
                )}
                {(events[selectedDate] || []).map(ev => {
                  const color = ev.type === 'alert' ? '#ef4444' : ev.type === 'warning' ? '#f59e0b' : '#3b82f6';
                  return (
                    <div key={ev.id} className="shift-item" style={{ borderLeftColor: color }}>
                      <div className="shift-item-info">
                        <span className="shift-item-doc">{ev.text}</span>
                        <span className="shift-item-type">
                          {ev.type === 'alert' ? 'Alerta' : ev.type === 'warning' ? 'Atención' : 'Info'}
                        </span>
                      </div>
                      <button 
                        className="task-action-btn delete" 
                        onClick={() => handleDeleteEvent(ev.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* SECCIÓN GUARDIAS */}
            <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', marginBottom: '1rem', marginTop: 0 }}>
                <Users size={18} color="#8b5cf6" /> Guardias del Hospital
              </h3>

              <div className="shift-list" style={{ marginBottom: '1rem', marginTop: 0 }}>
                {(shifts[selectedDate] || []).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No hay guardias asignadas.
                  </div>
                )}
                {(shifts[selectedDate] || []).map(docId => {
                  const doc = doctors[docId];
                  if (!doc) return null;
                  return (
                    <div key={docId} className="shift-item" style={{ borderLeftColor: doc.color }}>
                      <div className="shift-item-info">
                        <span className="shift-item-doc">{doc.name}</span>
                        <span className="shift-item-type">Guardia 24h</span>
                      </div>
                      <button 
                        className="task-action-btn delete" 
                        onClick={() => handleDeleteShift(docId)}
                        title="Eliminar guardia"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* SECCIÓN CONTRACCIONES */}
            {(() => {
              const dayContractions = (contractions.history || []).filter(session => {
                const sessionDate = new Date(session.startTime);
                return `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}` === selectedDate;
              });
              
              if (dayContractions.length === 0) return null;
              
              return (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
                    <Activity size={18} color="#e11d48" /> Registro de Contracciones
                  </h3>
                  <div className="shift-list" style={{ marginTop: '0.5rem' }}>
                    {dayContractions.map(session => (
                      <div key={session.id} className="shift-item" style={{ borderLeftColor: '#e11d48' }}>
                        <div className="shift-item-info">
                          <span className="shift-item-doc">{session.name}</span>
                          <span className="shift-item-type">{session.contractions?.length || 0} contracciones registradas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}
    </div>
  );
}
