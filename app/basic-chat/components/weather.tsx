export type WeatherProps = {
    temperature: number;
    weather: string;
    location: string;
  };
  
  export const Weather = ({ temperature, weather, location }: WeatherProps) => {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #000 0%, #333 100%)',
        color: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxWidth: '320px',
        border: '1px solid #444'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '500',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: '#ccc',
            borderBottom: '1px solid #555',
            paddingBottom: '8px'
          }}>
            📍 {location}
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px'
          }}>
            <div style={{
              fontSize: '56px',
              fontWeight: 'bold',
              lineHeight: '1',
              letterSpacing: '-2px'
            }}>
              {temperature}°
            </div>
            
            <div style={{
              fontSize: '18px',
              fontWeight: '500',
              textAlign: 'right',
              color: '#e0e0e0',
              textTransform: 'capitalize'
            }}>
              {weather}
            </div>
          </div>
          
          <div style={{
            fontSize: '11px',
            color: '#999',
            textAlign: 'right',
            marginTop: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Current Conditions
          </div>
        </div>
      </div>
    );
  };