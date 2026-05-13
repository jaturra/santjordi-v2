import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  // 👇 PON AQUÍ TUS DATOS REALES 👇
  const phoneNumber = "936 45 85 44"; 
  const cleanPhoneUrl = phoneNumber.replace(/\s/g, '');
  
  // Pon aquí la dirección de Google Maps de tu local para que el botón funcione
  const googleMapsLink = "https://maps.app.goo.gl/cSw6nUjv3eTDMCr98";

  return (
    <div className="home-base">
      
      {/* --- CABECERA SUPERIOR --- */}
      <header className="home-base__header">
        <div className="home-base__header-inner">
          <h1 className="home-base__logo">BAR SANT JORDI</h1>
        </div>
      </header>

      <main className="home-base__main">
        
        {/* --- BANNER PRINCIPAL (FOTO Y BOTONES) --- */}
        <section className="home-banner">
          <div className="home-banner__image-wrapper">
            <img src="/entrada.jpeg" alt="Entrada del Bar Sant Jordi" className="home-banner__img" />
            
            {/* Capa oscura sobre la imagen para que se lea el texto */}
            <div className="home-banner__overlay">
              <h2 className="home-banner__title">BIENVENIDO</h2>
              <div className="home-banner__rule"></div>
              <p className="home-banner__subtitle">Tapas • Platos • Sugerencias</p>
              
              <div className="home-banner__actions">
                <Link className="home-banner__btn home-banner__btn--primary" to="/carta">
                  VER LA CARTA
                </Link>
                <Link className="home-banner__btn home-banner__btn--secondary" to="/sugerencias">
                  SUGERENCIAS
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECCIÓN DE INFORMACIÓN (TARJETAS) --- */}
        <section className="home-info">
          
          {/* Tarjeta 1: Reservas */}
          <div className="info-card">
            <div className="info-card__icon">📞</div>
            <h3 className="info-card__title">Reservas</h3>
            <p className="info-card__text">Asegura tu mesa llamándonos directamente.</p>
            <a href={`tel:${cleanPhoneUrl}`} className="info-card__link info-card__link--phone">
              {phoneNumber}
            </a>
          </div>

          {/* Tarjeta 2: Horarios */}
          <div className="info-card">
            <div className="info-card__icon">🕒</div>
            <h3 className="info-card__title">Horario</h3>
            <ul className="info-card__list">
              <li><strong>Lunes:</strong> Cerrado por descanso</li>
              <li><strong>Mar - Dom:</strong> 09:00 - 23:00</li>
            </ul>
            <p className="info-card__note">
              * Fines de semana y festivos el horario de cierre puede prolongarse.
            </p>
          </div>

          {/* Tarjeta 3: Ubicación (Sugerencia añadida) */}
          <div className="info-card">
            <div className="info-card__icon">📍</div>
            <h3 className="info-card__title">Dónde estamos</h3>
            <p className="info-card__text">Ven a visitarnos y disfruta de nuestra terraza.</p>
            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="info-card__btn">
              CÓMO LLEGAR
            </a>
          </div>

        </section>
      </main>


      
    </div>
  );
}