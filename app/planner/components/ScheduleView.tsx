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
    // Extract date directly from ISO string to avoid UTC conversion
    const date = block.start.split('T')[0];
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
  const start = new Date(window.start + 'T00:00:00');
  const end = new Date(window.end + 'T00:00:00');
  
  // Use the timezone to get proper date iteration
  const tz = window.tz || 'UTC';
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz
  });
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
}

// Format date for display
function formatDate(dateStr: string, tz?: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz || 'UTC'
  }).format(date);
}

// Format short date (for week view)
function formatShortDate(dateStr: string, tz?: string): { day: string; date: string; weekday: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: tz || 'UTC'
  });
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    timeZone: tz || 'UTC'
  });
  return {
    weekday: formatter.format(date),
    date: dateFormatter.format(date),
    day: dateStr
  };
}

// Format time for display
function formatTime(isoString: string, tz?: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz || undefined
  }).format(date);
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

  const handleEditWithAI = (block: ScheduleBlock) => {
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
        height: '56px',
        padding: '0 16px',
        borderBottom: '1px solid #e0e0e0',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
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
              {view === 'day' && selectedDate ? formatDate(selectedDate, window.tz) : `${dayCount} Day${dayCount !== 1 ? 's' : ''}`}
            </h1>
            {window.start && window.end && view !== 'day' && (
              <div style={{ 
                fontSize: '11px',
                color: '#999',
                fontWeight: '300'
              }}>
                {new Intl.DateTimeFormat('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  timeZone: window.tz || 'UTC'
                }).format(new Date(window.start + 'T00:00:00'))} - {new Intl.DateTimeFormat('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  timeZone: window.tz || 'UTC'
                }).format(new Date(window.end + 'T00:00:00'))}
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
            borderRadius: '6px',
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
            window={window}
          />
        ) : (
          <DayView
            date={selectedDate!}
            blocks={groupedBlocks.get(selectedDate!) || []}
            onEditWithAI={handleEditWithAI}
            onDelete={handleDelete}
            window={window}
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
  onDayClick,
  window
}: { 
  dates: string[]; 
  groupedBlocks: Map<string, ScheduleBlock[]>;
  onDayClick: (date: string) => void;
  window: ScheduleWindow;
}) {
  const dayCount = dates.length;
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate responsive sizing based on both day count and available space
  const getDynamicSizing = () => {
    if (dayCount <= 3) {
      return {
        cardGap: '8px',
        cardPadding: '10px',
        weekdaySize: '9px',
        dateSize: '22px',
        dateCircleSize: '32px',
        timeSize: '9px',
        titleSize: '11px',
        eventPadding: '5px 6px',
        eventGap: '3px',
        containerPadding: '16px',
        eventHeight: '32px',
        maxEvents: isExpanded ? 10 : 5
      };
    } else if (dayCount <= 7) {
      return {
        cardGap: '6px',
        cardPadding: '8px',
        weekdaySize: '8px',
        dateSize: '18px',
        dateCircleSize: '28px',
        timeSize: '8px',
        titleSize: '10px',
        eventPadding: '4px 5px',
        eventGap: '2px',
        containerPadding: '12px',
        eventHeight: '28px',
        maxEvents: isExpanded ? 8 : 4
      };
    } else {
      return {
        cardGap: '6px',
        cardPadding: '6px',
        weekdaySize: '7px',
        dateSize: '16px',
        dateCircleSize: '22px',
        timeSize: '7px',
        titleSize: '8px',
        eventPadding: '3px 4px',
        eventGap: '2px',
        containerPadding: '8px',
        eventHeight: '24px',
        maxEvents: 3
      };
    }
  };
  
  const sizing = getDynamicSizing();
  
  // For short date ranges (1-3 days), use a simple flex layout without week grid
  const useSimpleLayout = dayCount <= 3;
  
  // Group dates by week for grid layout - but pad weeks to 7 days for equal sizing
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];
  
  if (!useSimpleLayout) {
    // Start from the first date's day of week
    const firstDate = dates[0];
    const firstDayOfWeek = new Date(firstDate + 'T00:00:00').getDay();
    
    // Add padding for days before the first date
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    dates.forEach((date) => {
      currentWeek.push(date);
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      
      // End of week (Saturday)
      if (dayOfWeek === 6) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    // Add remaining week if it exists
    if (currentWeek.length > 0) {
      // Pad the last week to 7 days
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
  }

  const isSingleRow = weeks.length === 1;

  // Simple layout for 1-3 days
  if (useSimpleLayout) {
    return (
      <div style={{ 
        padding: sizing.containerPadding,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          gap: sizing.cardGap,
          justifyContent: 'center',
          alignItems: 'stretch',
          maxWidth: '100%',
          width: '100%',
          minHeight: isExpanded ? '400px' : '180px',
          maxHeight: isExpanded ? '600px' : '300px',
          transition: 'all 0.3s ease'
        }}>
          {dates.map(date => {
            const dayData = formatShortDate(date, window.tz);
            const dayBlocks = groupedBlocks.get(date) || [];
            const isToday = date === new Date().toISOString().split('T')[0];
            
            return (
              <div
                key={date}
                style={{
                  flex: '1 1 0',
                  minWidth: '0',
                  maxWidth: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <DayCard
                  date={date}
                  dayData={dayData}
                  dayBlocks={dayBlocks}
                  isToday={isToday}
                  sizing={sizing}
                  onDayClick={onDayClick}
                  window={window}
                />
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '4px 12px',
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '16px',
            cursor: 'pointer',
            fontSize: '10px',
            color: '#666',
            fontWeight: '400',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s',
            alignSelf: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
            e.currentTarget.style.borderColor = '#999';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.borderColor = '#e0e0e0';
          }}
        >
          {isExpanded ? '▲' : '▼'} {isExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>
    );
  }

  // Week grid layout for 4+ days
  return (
    <div style={{ 
      padding: sizing.containerPadding,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: sizing.cardGap,
      overflow: isSingleRow && isExpanded ? 'auto' : 'hidden',
      justifyContent: isSingleRow && !isExpanded ? 'center' : 'flex-start',
      alignItems: isSingleRow ? 'center' : 'stretch'
    }}>
      {weeks.map((week, weekIndex) => (
        <div 
          key={weekIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: sizing.cardGap,
            flex: isSingleRow ? '0 1 auto' : '1 1 0',
            minHeight: isSingleRow ? (isExpanded ? '400px' : '180px') : '0',
            minWidth: '0',
            maxHeight: isSingleRow ? (isExpanded ? '600px' : '300px') : 'none',
            height: isSingleRow ? 'auto' : '100%',
            width: '100%',
            transition: 'all 0.3s ease'
          }}
        >
          {week.map((date, dayIndex) => {
            if (!date) {
              // Empty cell for padding
              return (
                <div
                  key={`empty-${dayIndex}`}
                  style={{
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    minHeight: '0',
                    minWidth: '0'
                  }}
                />
              );
            }
            
            const dayData = formatShortDate(date, window.tz);
            const dayBlocks = groupedBlocks.get(date) || [];
            const isToday = date === new Date().toISOString().split('T')[0];
            
            return (
              <DayCard
                key={date}
                date={date}
                dayData={dayData}
                dayBlocks={dayBlocks}
                isToday={isToday}
                sizing={sizing}
                onDayClick={onDayClick}
                window={window}
              />
            );
          })}
        </div>
      ))}
      
      {/* Expand button for single row - at the bottom */}
      {isSingleRow && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '4px 12px',
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '16px',
            cursor: 'pointer',
            fontSize: '10px',
            color: '#666',
            fontWeight: '400',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s',
            alignSelf: 'center',
            marginTop: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
            e.currentTarget.style.borderColor = '#999';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.borderColor = '#e0e0e0';
          }}
        >
          {isExpanded ? '▲' : '▼'} {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

// Separate Day Card Component with dynamic event calculation
function DayCard({ 
  date, 
  dayData, 
  dayBlocks, 
  isToday, 
  sizing, 
  onDayClick,
  window 
}: {
  date: string;
  dayData: { weekday: string; date: string; day: string };
  dayBlocks: ScheduleBlock[];
  isToday: boolean;
  sizing: any;
  onDayClick: (date: string) => void;
  window: ScheduleWindow;
}) {
  // Simple max events based on sizing tier
  const maxEvents = sizing.maxEvents || 3;
  
  const visibleBlocks = dayBlocks.slice(0, maxEvents);
  const remainingCount = Math.max(0, dayBlocks.length - maxEvents);
  
  return (
    <div
      onClick={() => onDayClick(date)}
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: sizing.cardPadding,
        cursor: 'pointer',
        background: '#fff',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '0',
        minWidth: '0',
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
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
      {/* Header - Fixed height */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: sizing.eventGap,
        flexShrink: 0
      }}>
        <div style={{ 
          fontSize: sizing.weekdaySize, 
          fontWeight: '400',
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
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
          lineHeight: 1,
          flexShrink: 0
        }}>
          {dayData.date}
        </div>
      </div>
      
      {/* Events - Flexible height with overflow hidden */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: sizing.eventGap,
        flex: '1 1 0',
        minHeight: '0',
        overflow: 'hidden'
      }}>
        {visibleBlocks.map(block => (
          <div
            key={block.id}
            style={{
              padding: sizing.eventPadding,
              background: '#fafafa',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              overflow: 'hidden',
              flexShrink: 0,
              minHeight: sizing.eventHeight,
              maxHeight: sizing.eventHeight,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div style={{
              fontSize: sizing.timeSize,
              color: '#666',
              fontWeight: '300',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2
            }}>
              {formatTime(block.start, window.tz)}
            </div>
            <div style={{
              fontSize: sizing.titleSize,
              color: '#000',
              fontWeight: '400',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2
            }}>
              {block.title}
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div style={{
            fontSize: sizing.timeSize,
            color: '#999',
            padding: '2px 0',
            fontWeight: '300',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            +{remainingCount} more
          </div>
        )}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ 
  date, 
  blocks,
  onEditWithAI,
  onDelete,
  window
}: { 
  date: string;
  blocks: ScheduleBlock[];
  onEditWithAI: (block: ScheduleBlock) => void;
  onDelete: (block: ScheduleBlock) => void;
  window: ScheduleWindow;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ScheduleBlock | null>(null);

  const startEditing = (block: ScheduleBlock) => {
    setEditingId(block.id);
    setEditForm({ ...block });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (editForm) {
      // Send updated block details to AI
      const timeStr = `${formatTime(editForm.start, window.tz)} - ${formatTime(editForm.end, window.tz)}`;
      let message = `Update "${editForm.title}" to be at ${timeStr}`;
      if (editForm.location) {
        message += ` at ${editForm.location}`;
      }
      if (editForm.notes) {
        message += `. Notes: ${editForm.notes}`;
      }
      onEditWithAI(editForm);
      cancelEditing();
    }
  };
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
            const isEditing = editingId === block.id;
            
            return (
              <div key={block.id}>
                {/* Event card */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: gap ? '0' : '8px',
                    transition: 'border-color 0.15s'
                  }}
                >
                  {isEditing && editForm ? (
                    // Edit mode
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Title"
                        style={{
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          outline: 'none',
                          fontWeight: '500'
                        }}
                      />
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="time"
                          value={new Date(editForm.start).toTimeString().slice(0, 5)}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newStart = new Date(editForm.start);
                            newStart.setHours(parseInt(hours), parseInt(minutes));
                            setEditForm({ ...editForm, start: newStart.toISOString() });
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                        />
                        <span style={{ display: 'flex', alignItems: 'center', color: '#999' }}>-</span>
                        <input
                          type="time"
                          value={new Date(editForm.end).toTimeString().slice(0, 5)}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newEnd = new Date(editForm.end);
                            newEnd.setHours(parseInt(hours), parseInt(minutes));
                            setEditForm({ ...editForm, end: newEnd.toISOString() });
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <input
                        type="text"
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        placeholder="Location (optional)"
                        style={{
                          padding: '6px 8px',
                          fontSize: '11px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />

                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Notes (optional)"
                        rows={2}
                        style={{
                          padding: '6px 8px',
                          fontSize: '11px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />

                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelEditing}
                          style={{
                            padding: '5px 12px',
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            color: '#666',
                            fontWeight: '400'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEditing}
                          style={{
                            padding: '5px 12px',
                            background: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            color: '#fff',
                            fontWeight: '400'
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '15px',
                          fontWeight: '400',
                          color: '#000',
                          marginBottom: '4px'
                        }}>
                          {block.title}
                        </div>
                        <div style={{ 
                          fontSize: '12px',
                          color: '#666',
                          fontWeight: '300',
                          marginBottom: '6px'
                        }}>
                          {formatTime(block.start, window.tz)} - {formatTime(block.end, window.tz)}
                        </div>
                        {block.location && (
                          <div style={{ 
                            fontSize: '11px',
                            color: '#999',
                            marginTop: '4px'
                          }}>
                            📍 {block.location}
                          </div>
                        )}
                        {block.notes && (
                          <div style={{ 
                            fontSize: '11px',
                            color: '#666',
                            marginTop: '4px',
                            lineHeight: '1.4'
                          }}>
                            {block.notes}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ 
                        display: 'flex',
                        gap: '6px',
                        flexShrink: 0,
                        alignItems: 'start'
                      }}>
                        <button
                          onClick={() => startEditing(block)}
                          title="Edit"
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            color: '#333',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                            e.currentTarget.style.borderColor = '#999';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => onEditWithAI(block)}
                          title="Edit with AI"
                          style={{
                            padding: '4px 8px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            background: '#fff',
                            color: '#333',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '400',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                            e.currentTarget.style.borderColor = '#999';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                          </svg>
                          <span>Edit with AI</span>
                        </button>
                        <button
                          onClick={() => onDelete(block)}
                          title="Delete"
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            color: '#999',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fff0f0';
                            e.currentTarget.style.borderColor = '#ffcccc';
                            e.currentTarget.style.color = '#cc0000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                            e.currentTarget.style.color = '#999';
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gap indicator - only show when not editing */}
                {gap && !isEditing && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 0',
                    margin: '0 0 8px 0'
                  }}>
                    <div style={{
                      flex: 1,
                      height: '1px',
                      background: 'linear-gradient(to right, transparent, #e0e0e0 30%, #e0e0e0 70%, transparent)'
                    }} />
                    <div style={{
                      fontSize: '9px',
                      color: '#aaa',
                      fontWeight: '300',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      padding: '3px 10px',
                      background: '#fafafa',
                      borderRadius: '12px',
                      border: '1px solid #f0f0f0'
                    }}>
                      {gap.text}
                    </div>
                    <div style={{
                      flex: 1,
                      height: '1px',
                      background: 'linear-gradient(to right, transparent, #e0e0e0 30%, #e0e0e0 70%, transparent)',
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

