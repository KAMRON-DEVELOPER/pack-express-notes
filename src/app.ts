import express, { type Application, type Request, type Response } from 'express';

// -----------------------------
// Express App
// -----------------------------
const PORT = parseInt(process.env.PORT || '3000', 10);
export const SERVICE_NAME = process.env.SERVICE_NAME || 'notes-service';

const app: Application = express();
app.use(express.json());

// -----------------------------
// Data Models
// -----------------------------
interface IdParams {
  id: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived: boolean;
}

interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
}

interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  archived?: boolean;
}

// In-memory database
const notesDB = new Map<number, Note>();
let nextId = 1;

// Seed data
const seedNotes = [
  { title: 'Meeting Notes', content: 'Discussed Q1 roadmap and team priorities', tags: ['work', 'meetings'] },
  { title: 'Shopping List', content: 'Milk, eggs, bread, coffee beans', tags: ['personal', 'todo'] },
  { title: 'Project Ideas', content: 'Build a note-taking app with real-time sync', tags: ['projects', 'ideas'] },
  { title: 'Book Recommendations', content: 'The Pragmatic Programmer, Clean Code', tags: ['books', 'learning'] },
];

seedNotes.forEach((note) => {
  const now = new Date().toISOString();
  notesDB.set(nextId, {
    id: nextId,
    title: note.title,
    content: note.content,
    tags: note.tags,
    created_at: now,
    updated_at: now,
    archived: false,
  });
  nextId++;
});

// -----------------------------
// Helper Functions
// -----------------------------
function queryToString(value: unknown, fallback = 'none'): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(',');
  return fallback;
}

function validateNote(note: CreateNoteRequest | UpdateNoteRequest): string | null {
  if ('title' in note && note.title !== undefined) {
    if (note.title.length === 0) return 'Title cannot be empty';
    if (note.title.length > 200) return 'Title too long (max 200 chars)';
  }
  if ('content' in note && note.content !== undefined) {
    if (note.content.length > 10000) return 'Content too long (max 10000 chars)';
  }
  if ('tags' in note && note.tags !== undefined) {
    if (note.tags.length > 10) return 'Too many tags (max 10)';
  }
  return null;
}

function searchNotes(query: string, tags?: string[]): Note[] {
  const results: Note[] = [];
  const lowerQuery = query.toLowerCase();

  for (const note of notesDB.values()) {
    if (note.archived) continue;

    // Check if query matches title or content
    const matchesQuery = !query || note.title.toLowerCase().includes(lowerQuery) || note.content.toLowerCase().includes(lowerQuery);

    // Check if all required tags are present
    const matchesTags = !tags || tags.length === 0 || tags.every((tag) => note.tags.includes(tag));

    if (matchesQuery && matchesTags) {
      results.push(note);
    }
  }

  return results;
}

// -----------------------------
// Routes
// -----------------------------

// Health check
app.get('/', (_req: Request, res: Response) => {
  try {
    console.log('Root endpoint called');

    res.json({
      status: 'ok',
      service: SERVICE_NAME,
      version: '1.0.0',
      notes_count: notesDB.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Root handler failed' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  try {
    console.log('Health check endpoint called');

    res.json({
      status: 'healthy',
      service: SERVICE_NAME,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy' });
  }
});

// List all notes
app.get('/notes', (req: Request, res: Response) => {
  try {
    const { q, tag, archived } = req.query;

    const tags = tag ? (Array.isArray(tag) ? (tag as string[]) : [tag as string]) : undefined;

    const showArchived = archived === 'true';

    const query = queryToString(q);
    const tagString = tags?.join(',') ?? 'none';

    let notes = Array.from(notesDB.values());

    if (!showArchived) {
      notes = notes.filter((n) => !n.archived);
    }

    if (q || tags) {
      notes = searchNotes((q as string) || '', tags);
    }

    res.json({ notes, count: notes.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

// Get single note
app.get('/notes/:id', (req: Request<IdParams>, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const note = notesDB.get(id);

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json({ note });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Create new note
app.post('/notes', (req: Request, res: Response) => {
  try {
    const { title, content, tags = [] } = req.body as CreateNoteRequest;

    const validationError = validateNote({ title, content, tags });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const now = new Date().toISOString();
    const note: Note = {
      id: nextId++,
      title,
      content,
      tags,
      created_at: now,
      updated_at: now,
      archived: false,
    };

    notesDB.set(note.id, note);

    res.status(201).json({ note });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
app.put('/notes/:id', (req: Request<IdParams>, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body as UpdateNoteRequest;

    const validationError = validateNote(updates);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const note = notesDB.get(id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const updatedNote = {
      ...note,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    notesDB.set(id, updatedNote);

    res.json({ note: updatedNote });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
app.delete('/notes/:id', (req: Request<IdParams>, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const note = notesDB.get(id);

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    notesDB.delete(id);

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get statistics
app.get('/stats', (_req: Request, res: Response) => {
  try {
    const notes = Array.from(notesDB.values());

    const totalNotes = notes.length;
    const archivedNotes = notes.filter((n) => n.archived).length;

    res.json({
      total_notes: totalNotes,
      archived_notes: archivedNotes,
      active_notes: totalNotes - archivedNotes,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// -----------------------------
// Start Server
// -----------------------------
const server = app.listen(PORT, () => {
  console.log(`🚀 ${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`Seeded with ${notesDB.size} sample notes`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[INFO] Server closed');
  });
});
