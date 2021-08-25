import './AboutComponent.css';
import { useTranslation } from 'react-i18next';

function About(props) {
    const { t, i18n } = useTranslation();
    return (
        <div class='content about'>
            <div class='team'>
                <h2>{t('about.team')}</h2>
                <img src='stefan.jpeg' class='team_images'></img>
                <p>Stefan Ohrhallinger<br></br><small>{t('about.stefan')}</small></p>
                <hr class='seperator'></hr>
                <img src='philipp.jpeg' class='team_images'></img>
                <p>Philipp Erler<br></br><small>{t('about.philipp')}</small></p>
                <hr class='seperator'></hr>
                <img src='sophie.png' class='team_images'></img>
                <p>Sophie Pichler<br></br><small>{t('about.sophie')}</small></p>
            </div>
            <div className='wrapper_centered_box text'>
                <h2>{t('about.netidee')}</h2>
                <p>{t('about.content')}<a href="url">https://github.com/ErlerPhilipp/points2surf</a></p>
            </div>
        </div>
    );
}

export default About;