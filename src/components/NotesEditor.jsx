import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, FileText } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { socket } from '../socket'
import './NotesEditor.css'

const NotesEditor = () => {
  const [data, setData] = useState(null);
  const [activePageId, setActivePageId] = useState(null);
  const saveTimeoutRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    fetch('/api/state/notes_data')
      .then(res => res.json())
      .then(saved => {
        if (saved && saved.pages && saved.pages.length > 0) {
          isRemoteUpdate.current = true;
          setData(saved);
          setActivePageId(saved.activePageId || saved.pages[0].id);
        } else {
          // Initialize default
          const defaultId = uuidv4();
          setData({
            pages: [{ id: defaultId, title: 'Notas Generales', content: '<h1>Notas Generales</h1><p>Empieza a escribir aquí...</p>' }]
          });
          setActivePageId(defaultId);
        }
      })
      .catch(err => console.error("Error loading notes", err));

    const handleStateUpdate = (update) => {
      if (update.key === 'notes_data') {
        isRemoteUpdate.current = true;
        setData(update.value);
      }
    };
    
    socket.on('state-updated', handleStateUpdate);
    return () => socket.off('state-updated', handleStateUpdate);
  }, []);

  const activePage = data?.pages.find(p => p.id === activePageId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.extend({
        addKeyboardShortcuts() {
          const parentShortcuts = this.parent?.() || {};
          return {
            ...parentShortcuts,
            'Enter': () => this.editor.commands.splitListItem(this.name),
            'Tab': () => this.editor.commands.sinkListItem(this.name),
            'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
          }
        },
      }).configure({ nested: true }),
      Underline,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      
      // Extract title from h1 if present
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const h1 = tempDiv.querySelector('h1');
      const title = h1 ? h1.innerText : 'Sin título';

      setData(prevData => {
        const newPages = prevData.pages.map(p => 
          p.id === activePageId ? { ...p, content: html, title } : p
        );
        return { ...prevData, pages: newPages };
      });
    },
  });

  // Switch document content when active page changes or external update arrives
  useEffect(() => {
    if (editor && activePage) {
      if (editor.getHTML() !== activePage.content) {
        // preserve cursor position if possible? TipTap is smart enough if we don't blind-replace
        // But for multiple pages we must replace
        editor.commands.setContent(activePage.content);
      }
    }
  }, [editor, activePage?.id, isRemoteUpdate.current]);

  // Save to DB when data changes (debounced)
  useEffect(() => {
    if (!data) return;
    
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch('/api/state/notes_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(err => console.error("Error saving notes state", err));
    }, 1000);
  }, [data]);

  const addPage = () => {
    const newId = uuidv4();
    const newPage = { id: newId, title: 'Nueva Nota', content: '<h1>Nueva Nota</h1>' };
    setData(prev => ({
      ...prev,
      pages: [...prev.pages, newPage]
    }));
    setActivePageId(newId);
  };

  const deletePage = (id, e) => {
    e.stopPropagation();
    if (data.pages.length === 1) return; // don't delete last page
    setData(prev => {
      const newPages = prev.pages.filter(p => p.id !== id);
      if (activePageId === id) {
        setActivePageId(newPages[0].id);
      }
      return { ...prev, pages: newPages };
    });
  };

  if (!data) {
    return <div className="notes-container"><p>Cargando notas...</p></div>;
  }

  return (
    <div className="notes-layout">
      <div className="notes-sidebar">
        <div className="sidebar-header">
          <h3>Mis Notas</h3>
          <button className="add-page-btn" onClick={addPage} title="Nueva Nota"><Plus size={18} /></button>
        </div>
        <div className="pages-list">
          {data.pages.map(page => (
            <div 
              key={page.id} 
              className={`page-item ${activePageId === page.id ? 'active' : ''}`}
              onClick={() => setActivePageId(page.id)}
            >
              <FileText size={16} className="page-icon" />
              <span className="page-title">{page.title}</span>
              {data.pages.length > 1 && (
                <button className="delete-page-btn" onClick={(e) => deletePage(page.id, e)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="notes-container">
        <div className="notes-editor-wrapper">
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;
