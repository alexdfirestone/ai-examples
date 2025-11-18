import type { ScheduleState } from '../../api/schedule-planner/tools';

export const exampleSchedules: Record<string, ScheduleState> = {
  'empty': {
    window: {},
    blocks: []
  },

  '2-day': {
    window: {
      start: '2025-06-14',
      end: '2025-06-15',
      tz: 'America/Los_Angeles'
    },
    blocks: [
      {
        id: '1',
        start: '2025-06-14T09:00:00-07:00',
        end: '2025-06-14T12:00:00-07:00',
        title: 'Team Workshop',
        location: 'Conference Room A',
        category: 'meeting'
      },
      {
        id: '2',
        start: '2025-06-14T12:30:00-07:00',
        end: '2025-06-14T13:30:00-07:00',
        title: 'Lunch at The Grove',
        location: 'Downtown',
        category: 'meal'
      },
      {
        id: '3',
        start: '2025-06-14T14:00:00-07:00',
        end: '2025-06-14T17:00:00-07:00',
        title: 'Product Strategy Session',
        location: 'Conference Room B',
        category: 'meeting'
      },
      {
        id: '4',
        start: '2025-06-14T18:00:00-07:00',
        end: '2025-06-14T20:00:00-07:00',
        title: 'Team Dinner',
        location: 'Waterfront Restaurant',
        category: 'meal'
      },
      {
        id: '5',
        start: '2025-06-15T10:00:00-07:00',
        end: '2025-06-15T12:00:00-07:00',
        title: 'Hackathon Kickoff',
        location: 'Main Hall',
        category: 'meeting'
      },
      {
        id: '6',
        start: '2025-06-15T13:00:00-07:00',
        end: '2025-06-15T16:00:00-07:00',
        title: 'Building & Demos',
        category: 'activity'
      },
      {
        id: '7',
        start: '2025-06-15T16:30:00-07:00',
        end: '2025-06-15T17:30:00-07:00',
        title: 'Awards & Closing',
        location: 'Main Hall',
        category: 'meeting'
      }
    ]
  },

  '5-day': {
    window: {
      start: '2025-07-07',
      end: '2025-07-11',
      tz: 'America/New_York'
    },
    blocks: [
      { id: '1', start: '2025-07-07T09:00:00-04:00', end: '2025-07-07T10:30:00-04:00', title: 'Kickoff Meeting', location: 'HQ', category: 'meeting' },
      { id: '2', start: '2025-07-07T11:00:00-04:00', end: '2025-07-07T12:30:00-04:00', title: 'Design Review', category: 'meeting' },
      { id: '3', start: '2025-07-07T14:00:00-04:00', end: '2025-07-07T17:00:00-04:00', title: 'Development Sprint', category: 'activity' },
      { id: '4', start: '2025-07-08T09:30:00-04:00', end: '2025-07-08T11:00:00-04:00', title: 'Client Presentation', category: 'meeting' },
      { id: '5', start: '2025-07-08T12:00:00-04:00', end: '2025-07-08T13:00:00-04:00', title: 'Team Lunch', category: 'meal' },
      { id: '6', start: '2025-07-08T14:00:00-04:00', end: '2025-07-08T16:00:00-04:00', title: 'QA Testing', category: 'activity' },
      { id: '7', start: '2025-07-09T10:00:00-04:00', end: '2025-07-09T12:00:00-04:00', title: 'Architecture Planning', category: 'meeting' },
      { id: '8', start: '2025-07-09T13:30:00-04:00', end: '2025-07-09T15:30:00-04:00', title: 'Code Review', category: 'activity' },
      { id: '9', start: '2025-07-09T16:00:00-04:00', end: '2025-07-09T18:00:00-04:00', title: 'Documentation', category: 'activity' },
      { id: '10', start: '2025-07-10T09:00:00-04:00', end: '2025-07-10T11:30:00-04:00', title: 'User Testing', category: 'activity' },
      { id: '11', start: '2025-07-10T13:00:00-04:00', end: '2025-07-10T15:00:00-04:00', title: 'Bug Fixes', category: 'activity' },
      { id: '12', start: '2025-07-10T15:30:00-04:00', end: '2025-07-10T17:00:00-04:00', title: 'Deployment Prep', category: 'activity' },
      { id: '13', start: '2025-07-11T10:00:00-04:00', end: '2025-07-11T12:00:00-04:00', title: 'Final Demo', category: 'meeting' },
      { id: '14', start: '2025-07-11T14:00:00-04:00', end: '2025-07-11T16:00:00-04:00', title: 'Retrospective', category: 'meeting' },
      { id: '15', start: '2025-07-11T17:00:00-04:00', end: '2025-07-11T19:00:00-04:00', title: 'Celebration Dinner', category: 'meal' }
    ]
  },

  '1-week': {
    window: {
      start: '2025-08-03',
      end: '2025-08-09',
      tz: 'Europe/London'
    },
    blocks: [
      { id: '1', start: '2025-08-03T09:00:00+01:00', end: '2025-08-03T10:00:00+01:00', title: 'Arrival & Check-in', location: 'Hotel', category: 'travel' },
      { id: '2', start: '2025-08-03T11:00:00+01:00', end: '2025-08-03T13:00:00+01:00', title: 'Tower of London', location: 'Tower Hill', category: 'activity' },
      { id: '3', start: '2025-08-03T14:00:00+01:00', end: '2025-08-03T16:00:00+01:00', title: 'Tower Bridge', category: 'activity' },
      { id: '4', start: '2025-08-03T18:00:00+01:00', end: '2025-08-03T19:30:00+01:00', title: 'Pub Dinner', location: 'Borough Market', category: 'meal' },
      
      { id: '5', start: '2025-08-04T10:00:00+01:00', end: '2025-08-04T12:30:00+01:00', title: 'British Museum', location: 'Bloomsbury', category: 'activity' },
      { id: '6', start: '2025-08-04T13:00:00+01:00', end: '2025-08-04T14:00:00+01:00', title: 'Lunch at Covent Garden', category: 'meal' },
      { id: '7', start: '2025-08-04T15:00:00+01:00', end: '2025-08-04T17:00:00+01:00', title: 'National Gallery', category: 'activity' },
      { id: '8', start: '2025-08-04T19:00:00+01:00', end: '2025-08-04T21:00:00+01:00', title: 'West End Show', location: 'Theatre District', category: 'activity' },
      
      { id: '9', start: '2025-08-05T09:30:00+01:00', end: '2025-08-05T11:30:00+01:00', title: 'Buckingham Palace', category: 'activity' },
      { id: '10', start: '2025-08-05T12:00:00+01:00', end: '2025-08-05T14:00:00+01:00', title: 'St James Park Walk', category: 'activity' },
      { id: '11', start: '2025-08-05T15:00:00+01:00', end: '2025-08-05T17:00:00+01:00', title: 'Westminster Abbey', category: 'activity' },
      { id: '12', start: '2025-08-05T18:00:00+01:00', end: '2025-08-05T19:30:00+01:00', title: 'Thames River Cruise', category: 'activity' },
      
      { id: '13', start: '2025-08-06T10:00:00+01:00', end: '2025-08-06T13:00:00+01:00', title: 'Camden Market', category: 'activity' },
      { id: '14', start: '2025-08-06T14:00:00+01:00', end: '2025-08-06T16:00:00+01:00', title: 'Regent\'s Park', category: 'activity' },
      { id: '15', start: '2025-08-06T17:00:00+01:00', end: '2025-08-06T19:00:00+01:00', title: 'Shopping at Oxford Street', category: 'activity' },
      
      { id: '16', start: '2025-08-07T09:00:00+01:00', end: '2025-08-07T12:00:00+01:00', title: 'Tate Modern', category: 'activity' },
      { id: '17', start: '2025-08-07T13:00:00+01:00', end: '2025-08-07T15:00:00+01:00', title: 'Shakespeare\'s Globe', category: 'activity' },
      { id: '18', start: '2025-08-07T16:00:00+01:00', end: '2025-08-07T18:00:00+01:00', title: 'Borough Market', category: 'activity' },
      
      { id: '19', start: '2025-08-08T10:00:00+01:00', end: '2025-08-08T13:00:00+01:00', title: 'Portobello Market', location: 'Notting Hill', category: 'activity' },
      { id: '20', start: '2025-08-08T14:00:00+01:00', end: '2025-08-08T16:00:00+01:00', title: 'Kensington Palace', category: 'activity' },
      { id: '21', start: '2025-08-08T17:00:00+01:00', end: '2025-08-08T19:00:00+01:00', title: 'Hyde Park', category: 'activity' },
      
      { id: '22', start: '2025-08-09T09:00:00+01:00', end: '2025-08-09T11:00:00+01:00', title: 'Last-minute Shopping', category: 'activity' },
      { id: '23', start: '2025-08-09T12:00:00+01:00', end: '2025-08-09T13:00:00+01:00', title: 'Farewell Lunch', category: 'meal' },
      { id: '24', start: '2025-08-09T15:00:00+01:00', end: '2025-08-09T16:00:00+01:00', title: 'Departure', category: 'travel' }
    ]
  },

  '2-week': {
    window: {
      start: '2025-05-05',
      end: '2025-05-18',
      tz: 'Asia/Tokyo'
    },
    blocks: [
      // Week 1 - Tokyo
      { id: 'arrival', start: '2025-05-05T14:00:00+09:00', end: '2025-05-05T15:30:00+09:00', title: 'Arrival & Hotel Check-in', location: 'Shibuya', category: 'travel' },
      { id: 'shibuya', start: '2025-05-05T16:00:00+09:00', end: '2025-05-05T19:00:00+09:00', title: 'Explore Shibuya', category: 'activity' },
      { id: 'dinner1', start: '2025-05-05T19:30:00+09:00', end: '2025-05-05T21:00:00+09:00', title: 'Dinner at Ichiran Ramen', location: 'Shibuya', category: 'meal' },
      { id: 'temple', start: '2025-05-06T09:00:00+09:00', end: '2025-05-06T11:30:00+09:00', title: 'Senso-ji Temple', location: 'Asakusa', category: 'activity' },
      { id: 'market', start: '2025-05-06T12:00:00+09:00', end: '2025-05-06T14:00:00+09:00', title: 'Tsukiji Market', location: 'Tsukiji', category: 'activity' },
      { id: 'palace', start: '2025-05-06T15:00:00+09:00', end: '2025-05-06T17:00:00+09:00', title: 'Imperial Palace', location: 'Chiyoda', category: 'activity' },
      { id: 'harajuku', start: '2025-05-07T10:00:00+09:00', end: '2025-05-07T12:00:00+09:00', title: 'Harajuku & Meiji Shrine', location: 'Harajuku', category: 'activity' },
      { id: 'lunch7', start: '2025-05-07T12:30:00+09:00', end: '2025-05-07T14:00:00+09:00', title: 'Lunch in Omotesando', location: 'Omotesando', category: 'meal' },
      { id: 'ginza', start: '2025-05-07T16:00:00+09:00', end: '2025-05-07T19:00:00+09:00', title: 'Ginza Shopping', location: 'Ginza', category: 'activity' },
      { id: 'akihabara', start: '2025-05-08T10:00:00+09:00', end: '2025-05-08T13:00:00+09:00', title: 'Akihabara Electronics', location: 'Akihabara', category: 'activity' },
      { id: 'ueno', start: '2025-05-08T14:30:00+09:00', end: '2025-05-08T17:00:00+09:00', title: 'Ueno Park & Museums', location: 'Ueno', category: 'activity' },
      { id: 'teamdinner', start: '2025-05-08T19:00:00+09:00', end: '2025-05-08T21:30:00+09:00', title: 'Team Dinner', location: 'Roppongi', category: 'meal' },
      // Week 2 - Kyoto & Osaka
      { id: 'train', start: '2025-05-12T09:00:00+09:00', end: '2025-05-12T11:30:00+09:00', title: 'Shinkansen to Kyoto', category: 'travel' },
      { id: 'kyoto-checkin', start: '2025-05-12T12:00:00+09:00', end: '2025-05-12T13:00:00+09:00', title: 'Hotel Check-in', location: 'Kyoto', category: 'travel' },
      { id: 'fushimi', start: '2025-05-12T14:00:00+09:00', end: '2025-05-12T17:00:00+09:00', title: 'Fushimi Inari Shrine', location: 'Fushimi', category: 'activity' },
      { id: 'gion', start: '2025-05-13T10:00:00+09:00', end: '2025-05-13T13:00:00+09:00', title: 'Gion District', location: 'Gion', category: 'activity' },
      { id: 'lunch13', start: '2025-05-13T13:30:00+09:00', end: '2025-05-13T15:00:00+09:00', title: 'Traditional Lunch', location: 'Pontocho', category: 'meal' },
      { id: 'arashiyama', start: '2025-05-13T16:00:00+09:00', end: '2025-05-13T18:30:00+09:00', title: 'Arashiyama Bamboo Forest', location: 'Arashiyama', category: 'activity' },
      { id: 'osaka-day', start: '2025-05-14T11:00:00+09:00', end: '2025-05-14T17:00:00+09:00', title: 'Day Trip to Osaka', location: 'Osaka', category: 'activity' },
      { id: 'osaka-dinner', start: '2025-05-14T18:00:00+09:00', end: '2025-05-14T20:00:00+09:00', title: 'Osaka Street Food', location: 'Dotonbori', category: 'meal' },
      { id: 'kinkakuji', start: '2025-05-15T09:00:00+09:00', end: '2025-05-15T11:30:00+09:00', title: 'Kinkaku-ji Temple', location: 'Kyoto', category: 'activity' },
      { id: 'nijo', start: '2025-05-15T13:00:00+09:00', end: '2025-05-15T15:30:00+09:00', title: 'Nijo Castle', location: 'Kyoto', category: 'activity' },
      { id: 'shopping', start: '2025-05-16T10:00:00+09:00', end: '2025-05-16T13:00:00+09:00', title: 'Last-minute Shopping', location: 'Kyoto Station', category: 'activity' },
      { id: 'farewell', start: '2025-05-16T18:00:00+09:00', end: '2025-05-16T20:30:00+09:00', title: 'Farewell Dinner', location: 'Kyoto', category: 'meal' },
      { id: 'return', start: '2025-05-17T10:00:00+09:00', end: '2025-05-17T12:30:00+09:00', title: 'Return to Tokyo', category: 'travel' },
      { id: 'departure-final', start: '2025-05-18T14:00:00+09:00', end: '2025-05-18T15:00:00+09:00', title: 'Departure from Narita', category: 'travel' }
    ]
  },

  '1-month': {
    window: {
      start: '2025-09-01',
      end: '2025-09-30',
      tz: 'Europe/Paris'
    },
    blocks: [
      // Week 1 - Paris
      { id: '1', start: '2025-09-01T10:00:00+02:00', end: '2025-09-01T12:00:00+02:00', title: 'Arrival & Check-in', location: 'Hotel Marais', category: 'travel' },
      { id: '2', start: '2025-09-01T14:00:00+02:00', end: '2025-09-01T17:00:00+02:00', title: 'Eiffel Tower', category: 'activity' },
      { id: '3', start: '2025-09-02T10:00:00+02:00', end: '2025-09-02T13:00:00+02:00', title: 'Louvre Museum', category: 'activity' },
      { id: '4', start: '2025-09-02T15:00:00+02:00', end: '2025-09-02T17:00:00+02:00', title: 'Seine River Cruise', category: 'activity' },
      { id: '5', start: '2025-09-03T11:00:00+02:00', end: '2025-09-03T13:00:00+02:00', title: 'Notre-Dame Area', category: 'activity' },
      { id: '6', start: '2025-09-04T10:00:00+02:00', end: '2025-09-04T12:00:00+02:00', title: 'Montmartre & Sacré-Cœur', category: 'activity' },
      { id: '7', start: '2025-09-05T14:00:00+02:00', end: '2025-09-05T17:00:00+02:00', title: 'Versailles Day Trip', category: 'activity' },
      
      // Week 2 - Barcelona
      { id: '8', start: '2025-09-08T09:00:00+02:00', end: '2025-09-08T11:00:00+02:00', title: 'Travel to Barcelona', category: 'travel' },
      { id: '9', start: '2025-09-08T14:00:00+02:00', end: '2025-09-08T17:00:00+02:00', title: 'La Sagrada Familia', category: 'activity' },
      { id: '10', start: '2025-09-09T10:00:00+02:00', end: '2025-09-09T13:00:00+02:00', title: 'Park Güell', category: 'activity' },
      { id: '11', start: '2025-09-09T15:00:00+02:00', end: '2025-09-09T18:00:00+02:00', title: 'Gothic Quarter', category: 'activity' },
      { id: '12', start: '2025-09-10T11:00:00+02:00', end: '2025-09-10T14:00:00+02:00', title: 'La Rambla & Boqueria Market', category: 'activity' },
      { id: '13', start: '2025-09-11T10:00:00+02:00', end: '2025-09-11T13:00:00+02:00', title: 'Picasso Museum', category: 'activity' },
      { id: '14', start: '2025-09-12T15:00:00+02:00', end: '2025-09-12T18:00:00+02:00', title: 'Beach Day', location: 'Barceloneta', category: 'activity' },
      
      // Week 3 - Rome
      { id: '15', start: '2025-09-15T09:00:00+02:00', end: '2025-09-15T11:00:00+02:00', title: 'Travel to Rome', category: 'travel' },
      { id: '16', start: '2025-09-15T14:00:00+02:00', end: '2025-09-15T17:00:00+02:00', title: 'Colosseum Tour', category: 'activity' },
      { id: '17', start: '2025-09-16T10:00:00+02:00', end: '2025-09-16T13:00:00+02:00', title: 'Roman Forum', category: 'activity' },
      { id: '18', start: '2025-09-16T15:00:00+02:00', end: '2025-09-16T17:00:00+02:00', title: 'Trevi Fountain & Spanish Steps', category: 'activity' },
      { id: '19', start: '2025-09-17T09:00:00+02:00', end: '2025-09-17T12:00:00+02:00', title: 'Vatican Museums', category: 'activity' },
      { id: '20', start: '2025-09-17T14:00:00+02:00', end: '2025-09-17T16:00:00+02:00', title: 'St. Peter\'s Basilica', category: 'activity' },
      { id: '21', start: '2025-09-18T11:00:00+02:00', end: '2025-09-18T14:00:00+02:00', title: 'Pantheon & Piazza Navona', category: 'activity' },
      { id: '22', start: '2025-09-19T10:00:00+02:00', end: '2025-09-19T13:00:00+02:00', title: 'Trastevere Walking Tour', category: 'activity' },
      
      // Week 4 - Florence & Venice
      { id: '23', start: '2025-09-22T09:00:00+02:00', end: '2025-09-22T11:00:00+02:00', title: 'Travel to Florence', category: 'travel' },
      { id: '24', start: '2025-09-22T13:00:00+02:00', end: '2025-09-22T16:00:00+02:00', title: 'Uffizi Gallery', category: 'activity' },
      { id: '25', start: '2025-09-23T10:00:00+02:00', end: '2025-09-23T12:00:00+02:00', title: 'Duomo & Baptistery', category: 'activity' },
      { id: '26', start: '2025-09-23T14:00:00+02:00', end: '2025-09-23T17:00:00+02:00', title: 'Accademia Gallery (David)', category: 'activity' },
      { id: '27', start: '2025-09-24T15:00:00+02:00', end: '2025-09-24T18:00:00+02:00', title: 'Ponte Vecchio & Shopping', category: 'activity' },
      { id: '28', start: '2025-09-26T09:00:00+02:00', end: '2025-09-26T11:00:00+02:00', title: 'Travel to Venice', category: 'travel' },
      { id: '29', start: '2025-09-26T14:00:00+02:00', end: '2025-09-26T17:00:00+02:00', title: 'St. Mark\'s Square & Basilica', category: 'activity' },
      { id: '30', start: '2025-09-27T10:00:00+02:00', end: '2025-09-27T13:00:00+02:00', title: 'Doge\'s Palace', category: 'activity' },
      { id: '31', start: '2025-09-27T15:00:00+02:00', end: '2025-09-27T17:00:00+02:00', title: 'Gondola Ride', category: 'activity' },
      { id: '32', start: '2025-09-28T11:00:00+02:00', end: '2025-09-28T14:00:00+02:00', title: 'Murano & Burano Islands', category: 'activity' },
      { id: '33', start: '2025-09-29T10:00:00+02:00', end: '2025-09-29T13:00:00+02:00', title: 'Last-minute Shopping', category: 'activity' },
      { id: '34', start: '2025-09-30T14:00:00+02:00', end: '2025-09-30T16:00:00+02:00', title: 'Departure', category: 'travel' }
    ]
  }
};

