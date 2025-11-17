'use client';

import { useState } from 'react';
import type { ScheduleBlock, ScheduleWindow } from '../../api/schedule-planner/tools';
import { downloadICS } from '../utils/ics-export';

interface ScheduleViewProps {
  window: ScheduleWindow;
  blocks: ScheduleBlock[];
  onSendMessage: (message: string) => void;
}

// Group blocks by date
function groupBlocksByDate(blocks: ScheduleBlock[]): Map<string, ScheduleBlock[]> {
  const grouped = new Map<string, ScheduleBlock[]>();
  
  for (const block of blocks) {
    const date = new Date(block.start).toISOString().split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(block);
  }
  
  // Sort blocks within each day by start time
  for (const [date, dayBlocks] of grouped) {
    dayBlocks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }
  
  return grouped;
}

// Get all dates in the window
function getAllDatesInWindow(window: ScheduleWindow): string[] {
  if (!window.start || !window.end) return [];
  
  const dates: string[] = [];
  const start = new Date(window.start);
  const end = new Date(window.end);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Format short date (for week view)
function formatShortDate(dateStr: string): { day: string; date: string; weekday: string } {
  const date = new Date(dateStr);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.getDate().toString(),
    day: dateStr
  };
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
}

// Get category emoji
function getCategoryEmoji(category?: string): string {
  const emojiMap: Record<string, string> = {
    meeting: '👥',
    meal: '🍽️',
    activity: '🎯',
    travel: '✈️',
    break: '☕',
    accommodation: '🏨'
  };
  return emojiMap[category || ''] || '📌';
}

export function ScheduleView({ window, blocks, onSendMessage }: ScheduleViewProps) {
  const groupedBlocks = groupBlocksByDate(blocks);
  const allDates = getAllDatesInWindow(window);
  
  // Calculate number of days in window
  const dayCount = allDates.length;
  
  const [view, setView] = useState<'overview' | 'day'>('overview');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleEdit = (block: ScheduleBlock) => {
    const message = `Edit the "${block.title}" block`;
    onSendMessage(message);
  };

  const handleDelete = (block: ScheduleBlock) => {
    const message = `Delete the "${block.title}" block`;
    onSendMessage(message);
  };

  const handleExport = () => {
    if (blocks.length === 0) {
      alert('No blocks to export. Add some activities to your schedule first!');
      return;
    }
    downloadICS(blocks, window);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToOverview = () => {
    setView('overview');
    setSelectedDate(null);
  };

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '10px 14px',
        borderBottom: '1px solid #e0e0e0',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {view === 'day' && (
            <button
              onClick={handleBackToOverview}
              style={{
                padding: '3px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#000',
                fontWeight: '400'
              }}
            >
              ← Back
            </button>
          )}
          <div>
            <h1 style={{ 
              margin: 0,
              fontSize: '14px',
              fontWeight: '500',
              color: '#000',
              marginBottom: '2px'
            }}>
              {view === 'day' && selectedDate ? formatDate(selectedDate) : `${dayCount} Day${dayCount !== 1 ? 's' : ''}`}
            </h1>
            {window.start && window.end && view !== 'day' && (
              <div style={{ 
                fontSize: '11px',
                color: '#999',
                fontWeight: '300'
              }}>
                {new Date(window.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(window.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={blocks.length === 0}
          style={{
            padding: '4px 10px',
            background: blocks.length > 0 ? '#000' : '#f5f5f5',
            color: blocks.length > 0 ? '#fff' : '#999',
            border: 'none',
            borderRadius: '3px',
            cursor: blocks.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: '400'
          }}
        >
          Export
        </button>
      </div>

      {/* Schedule Content */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {blocks.length === 0 && allDates.length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            padding: '40px 20px',
            color: '#999'
          }}>
            <div style={{ fontSize: '13px', marginBottom: '3px', color: '#666' }}>No events</div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Start chatting to build your schedule
            </div>
          </div>
        ) : view === 'overview' ? (
          <UnifiedCalendarView 
            dates={allDates}
            groupedBlocks={groupedBlocks}
            onDayClick={handleDayClick}
          />
        ) : (
          <DayView
            date={selectedDate!}
            blocks={groupedBlocks.get(selectedDate!) || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

// Unified Calendar View - Adapts intelligently to any date range
function UnifiedCalendarView({ 
  dates, 
  groupedBlocks, 
  onDayClick 
}: { 
  dates: string[]; 
  groupedBlocks: Map<string, ScheduleBlock[]>;
  onDayClick: (date: string) => void;
}) {
  const dayCount = dates.length;
  
  // Calculate responsive sizing
  const getDynamicSizing = () => {
    if (dayCount <= 3) {
      return {
        cardGap: '8px',
        cardPadding: '10px',
        cardMinHeight: '120px',
        weekdaySize: '9px',
        dateSize: '22px',
        dateCircleSize: '32px',
        timeSize: '9px',
        titleSize: '11px',
        eventPadding: '5px 6px',
        eventGap: '3px',
        maxEvents: 6,
        containerPadding: '16px'
      };
    } else if (dayCount <= 7) {
      return {
        cardGap: '6px',
        cardPadding: '8px',
        cardMinHeight: '100px',
        weekdaySize: '8px',
        dateSize: '18px',
        dateCircleSize: '28px',
        timeSize: '8px',
        titleSize: '10px',
        eventPadding: '4px 5px',
        eventGap: '2px',
        maxEvents: 5,
        containerPadding: '12px'
      };
    } else {
      return {
        cardGap: '6px',
        cardPadding: '6px',
        cardMinHeight: '80px',
        weekdaySize: '7px',
        dateSize: '16px',
        dateCircleSize: '22px',
        timeSize: '7px',
        titleSize: '8px',
        eventPadding: '3px 4px',
        eventGap: '2px',
        maxEvents: 3,
        containerPadding: '8px'
      };
    }
  };
  
  const sizing = getDynamicSizing();
  
  // Group dates by week for grid layout
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  
  dates.forEach((date, index) => {
    currentWeek.push(date);
    const dayOfWeek = new Date(date).getDay();
    
    // End of week (Saturday) or last date
    if (dayOfWeek === 6 || index === dates.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  return (
    <div style={{ 
      padding: sizing.containerPadding,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: sizing.cardGap
    }}>
      {weeks.map((week, weekIndex) => (
        <div 
          key={weekIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${week.length}, 1fr)`,
            gap: sizing.cardGap,
            flex: 1,
            minHeight: 0
          }}
        >
          {week.map(date => {
            const dayData = formatShortDate(date);
            const dayBlocks = groupedBlocks.get(date) || [];
            const isToday = date === new Date().toISOString().split('T')[0];
            const visibleBlocks = dayBlocks.slice(0, sizing.maxEvents);
            const remainingCount = Math.max(0, dayBlocks.length - sizing.maxEvents);
            
            return (
              <div
                key={date}
                onClick={() => onDayClick(date)}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                  padding: sizing.cardPadding,
                  cursor: 'pointer',
                  background: '#fff',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sizing.eventGap,
                  height: '100%',
                  minHeight: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fafafa';
                  e.currentTarget.style.borderColor = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                {/* Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: sizing.eventGap
                }}>
                  <div style={{ 
                    fontSize: sizing.weekdaySize, 
                    fontWeight: '400',
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {dayData.weekday}
                  </div>
                  <div style={{ 
                    fontSize: sizing.dateSize,
                    fontWeight: '300',
                    color: isToday ? '#000' : '#333',
                    border: isToday ? '1px solid #000' : 'none',
                    borderRadius: '50%',
                    width: sizing.dateCircleSize,
                    height: sizing.dateCircleSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {dayData.date}
                  </div>
                </div>
                
                {/* Events */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sizing.eventGap,
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden'
                }}>
                  {visibleBlocks.map(block => (
                    <div
                      key={block.id}
                      style={{
                        padding: sizing.eventPadding,
                        background: '#fafafa',
                        border: '1px solid #e0e0e0',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      <div style={{
                        fontSize: sizing.timeSize,
                        color: '#666',
                        fontWeight: '300',
                        marginBottom: '1px'
                      }}>
                        {formatTime(block.start)}
                      </div>
                      <div style={{
                        fontSize: sizing.titleSize,
                        color: '#000',
                        fontWeight: '400',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {block.title}
                      </div>
                    </div>
                  ))}
                  
                  {remainingCount > 0 && (
                    <div style={{
                      fontSize: sizing.timeSize,
                      color: '#999',
                      padding: `2px ${sizing.cardPadding.split(' ')[1] || '4px'}`,
                      fontWeight: '300',
                      flexShrink: 0,
                      marginTop: 'auto'
                    }}>
                      +{remainingCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Day View Component
function DayView({ 
  date, 
  blocks,
  onEdit,
  onDelete
}: { 
  date: string;
  blocks: ScheduleBlock[];
  onEdit: (block: ScheduleBlock) => void;
  onDelete: (block: ScheduleBlock) => void;
}) {
  // Calculate gaps between events
  const calculateGap = (currentBlock: ScheduleBlock, nextBlock: ScheduleBlock | undefined) => {
    if (!nextBlock) return null;
    
    const currentEnd = new Date(currentBlock.end);
    const nextStart = new Date(nextBlock.start);
    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
    
    // Only show gap if it's 15+ minutes
    if (gapMinutes < 15) return null;
    
    // Format gap duration
    const hours = Math.floor(gapMinutes / 60);
    const mins = Math.round(gapMinutes % 60);
    
    let gapText = '';
    if (hours > 0 && mins > 0) {
      gapText = `${hours}h ${mins}m free`;
    } else if (hours > 0) {
      gapText = `${hours}h free`;
    } else {
      gapText = `${mins}m free`;
    }
    
    return { minutes: gapMinutes, text: gapText };
  };

  return (
    <div style={{ background: '#fff', padding: '12px 20px', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: '100%' }}>
        {/* Simplified event list */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0'
        }}>
          {blocks.length === 0 ? (
            <div style={{ 
              textAlign: 'center',
              padding: '30px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '12px' }}>No events this day</div>
            </div>
          ) : blocks.map((block, index) => {
            const gap = calculateGap(block, blocks[index + 1]);
            
            return (
              <div key={block.id}>
                {/* Event card */}
                <div
                  style={{
                    background: '#fafafa',
                    border: '1px solid #e0e0e0',
                    borderLeft: '2px solid #000',
                    borderRadius: '2px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginBottom: gap ? '0' : '6px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '13px',
                        fontWeight: '400',
                        color: '#000',
                        marginBottom: '3px'
                      }}>
                        {block.title}
                      </div>
                      <div style={{ 
                        fontSize: '11px',
                        color: '#666',
                        fontWeight: '300'
                      }}>
                        {formatTime(block.start)} - {formatTime(block.end)}
                      </div>
                      {block.location && (
                        <div style={{ 
                          fontSize: '10px',
                          color: '#999',
                          marginTop: '3px'
                        }}>
                          {block.location}
                        </div>
                      )}
                      {block.notes && (
                        <div style={{ 
                          fontSize: '10px',
                          color: '#999',
                          marginTop: '3px'
                        }}>
                          {block.notes}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'flex',
                      gap: '4px',
                      flexShrink: 0
                    }}>
                      <button
                        onClick={() => onEdit(block)}
                        style={{
                          padding: '3px 8px',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          color: '#666',
                          fontWeight: '400'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(block)}
                        style={{
                          padding: '3px 8px',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          color: '#666',
                          fontWeight: '400'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gap indicator */}
                {gap && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 0',
                    margin: '0 0 6px 0'
                  }}>
                    <div style={{
                      flex: 1,
                      height: '1px',
                      background: 'linear-gradient(to right, transparent, #e0e0e0 20%, #e0e0e0 80%, transparent)',
                      position: 'relative'
                    }} />
                    <div style={{
                      fontSize: '9px',
                      color: '#999',
                      fontWeight: '300',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      padding: '2px 8px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0'
                    }}>
                      {gap.text}
                    </div>
                    <div style={{
                      flex: 1,
                      height: '1px',
                      background: 'linear-gradient(to right, transparent, #e0e0e0 20%, #e0e0e0 80%, transparent)',
                      transform: 'scaleX(-1)'
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

