import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const editor = new Editor({
  extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
  content: `
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false">
        <p>Parent Task</p>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false">
            <p>Nested Task</p>
          </li>
        </ul>
      </li>
    </ul>
  `
});
console.log(editor.getHTML());
