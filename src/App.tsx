import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import './App.css';

// Timetable slots as per your image (simplified for demo, expand as needed)
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const times = [
  { label: '8:30–10:00 AM', code: 0 },
  { label: '10:05–11:35 AM', code: 1 },
  { label: '11:40 AM–1:10 PM', code: 2 },
  { label: 'Lunch', code: 'lunch' },
  { label: '1:15–2:45 PM', code: 3 },
  { label: '2:50–4:20 PM', code: 4 },
  { label: '4:25–5:55 PM', code: 5 },
  { label: '6:00–7:30 PM', code: 6 },
];
const slotCodes = [
  ['A11', 'B11', 'C11', null, 'A21', 'A14', 'B21', 'C21'],
  ['D11', 'E11', 'F11', null, 'D21', 'E14', 'E21', 'F21'],
  ['A12', 'B12', 'C12', null, 'A22', 'B14', 'B22', 'A24'],
  ['D12', 'E12', 'F12', null, 'D22', 'F14', 'E22', 'F22'],
  ['A13', 'B13', 'C13', null, 'A23', 'C14', 'B23', 'B24'],
];

// Helper to generate slot ids
const getSlotId = (day: string, slot: string) => `${day}_${slot}`;

// Types
interface GreenBox {
  id: string;
  text: string;
}

interface TimetableState {
  [slotId: string]: GreenBox[];
}

const initialTimetable: { [slotId: string]: string[] } = {};
days.forEach(day => {
  times.forEach(time => {
    initialTimetable[getSlotId(day, time.label)] = [];
  });
});

const LOCAL_STORAGE_KEY = 'timetable-dnd-state';

function App() {
  // Pool is a list of box ids
  const [pool, setPool] = useState<string[]>([]);
  // Timetable is a mapping from slotId to list of box ids
  const [timetable, setTimetable] = useState<{ [slotId: string]: string[] }>(initialTimetable);
  // Green box data
  const [greenBoxes, setGreenBoxes] = useState<{ [id: string]: GreenBox }>({});
  const [boxCounter, setBoxCounter] = useState(1);

  // On mount, initialize pool with all box ids
  useEffect(() => {
    // If loading from localStorage, skip
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) {
      setPool([]);
      setGreenBoxes({});
    }
  }, []);

  // Save to downloadable JSON
  const saveTimetable = () => {
    const data = {
      timetable,
      pool,
      greenBoxes,
      boxCounter,
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load from uploaded JSON
  const loadTimetable = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          setTimetable(parsed.timetable);
          setPool(parsed.pool);
          setGreenBoxes(parsed.greenBoxes);
          setBoxCounter(parsed.boxCounter);
        } catch (err) {
          alert('Invalid file!');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Add a new green box to the pool
  const addGreenBox = () => {
    const id = `box-${boxCounter}`;
    setGreenBoxes(prev => ({ ...prev, [id]: { id, text: '' } }));
    setPool(prev => [...prev, id]);
    setBoxCounter(boxCounter + 1);
  };

  // Remove a green box from everywhere
  const removeGreenBox = (id: string) => {
    setGreenBoxes(prev => {
      const newBoxes = { ...prev };
      delete newBoxes[id];
      return newBoxes;
    });
    setPool(prev => prev.filter(boxId => boxId !== id));
    setTimetable(prev => {
      const newTable: { [slotId: string]: string[] } = {};
      for (const slot in prev) {
        newTable[slot] = prev[slot].filter(boxId => boxId !== id);
      }
      return newTable;
    });
  };

  // Handle drag and drop (multi-list pattern)
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Remove from source
    let sourceList: string[] = source.droppableId === 'pool' ? [...pool] : [...(timetable[source.droppableId] || [])];
    sourceList.splice(source.index, 1);

    // Add to destination
    let destList: string[] = destination.droppableId === 'pool' ? [...pool] : [...(timetable[destination.droppableId] || [])];
    destList.splice(destination.index, 0, draggableId);

    if (source.droppableId === 'pool') setPool(sourceList);
    else setTimetable(prev => ({ ...prev, [source.droppableId]: sourceList }));

    if (destination.droppableId === 'pool') setPool(destList);
    else setTimetable(prev => ({ ...prev, [destination.droppableId]: destList }));
  };

  // Edit box text
  const handleBoxTextChange = (id: string, text: string) => {
    setGreenBoxes(prev => ({ ...prev, [id]: { ...prev[id], text } }));
  };

  return (
    <div className="App">
      <h1 style={{ display: 'none' }}>FFCS Timetable Filler</h1>
      <div style={{ marginBottom: 16 }}>
        <button onClick={addGreenBox}>Add Green Box</button>
        <button onClick={saveTimetable} style={{ marginLeft: 8 }}>Save</button>
        <button onClick={loadTimetable} style={{ marginLeft: 8 }}>Load</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="timetable-container">
          <table className="timetable">
            <thead>
              <tr>
                <th>Slot Time</th>
                {times.map((time, idx) => (
                  <th key={idx}>{time.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => (
                <tr key={day}>
                  <td style={{ fontWeight: 600 }}>{day}</td>
                  {slotCodes[dayIdx].map((slot, slotIdx) => {
                    if (slot === null) {
                      return <td key={`lunch-${dayIdx}`} style={{ fontStyle: 'italic', color: '#888', background: '#f6f6f6' }}>Lunch</td>;
                    }
                    const slotId = getSlotId(day, slot);
                    return (
                      <td key={slotId} style={{ minWidth: 80 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{slot}</div>
                        <Droppable droppableId={slotId} direction="vertical">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="slot-droppable"
                              style={{ minHeight: 40 }}
                            >
                              {(timetable[slotId] || []).map((boxId, idx) => (
                                <Draggable key={boxId} draggableId={boxId} index={idx}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="green-box"
                                    >
                                      <input
                                        className="box-input"
                                        value={greenBoxes[boxId]?.text || ''}
                                        onChange={e => handleBoxTextChange(boxId, e.target.value)}
                                        placeholder="Type..."
                                      />
                                      <button className="remove-btn" onClick={() => removeGreenBox(boxId)}>×</button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pool of green boxes to drag from */}
          <div className="pool-container">
            <h3>Green Box Pool</h3>
            <Droppable droppableId="pool" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="pool-droppable"
                >
                  {pool.map((boxId, idx) => (
                    <Draggable key={boxId} draggableId={boxId} index={idx}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="green-box"
                        >
                          {greenBoxes[boxId]?.text || <span style={{ color: '#fff', opacity: 0.7 }}>Drag me</span>}
                          <button className="remove-btn" onClick={() => removeGreenBox(boxId)}>×</button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {pool.length === 0 && (
                    <div style={{ color: '#bbb', fontStyle: 'italic', padding: '8px 0' }}>No green boxes in pool</div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

export default App;
