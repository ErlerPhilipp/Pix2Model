import './AboutComponent.css';
import { useTranslation } from 'react-i18next';

function About(props) {
    const { t, i18n } = useTranslation();
    return (
        <div class='content about'>
            <div className='wrapper_centered_box text'>
                <h2>{t('about.netidee.top')}</h2>
                <p class='subheading'>{t('about.netidee.sub')}</p>
                <p>{t('about.content')}<a href="url">https://github.com/ErlerPhilipp/points2surf</a></p>
                <h2>Team</h2>
                <div class='team'>
                    <div class='team_member'>
                        <img src='stefan.jpeg' class='team_images'></img>
                        <p class='team_member_description'>Stefan Ohrhallinger<br></br><small>{t('about.stefan')}</small></p>
                    </div>
                    <div class='team_member'>
                        <img src='philipp.jpeg' class='team_images'></img>
                        <p class='team_member_description'>Philipp Erler<br></br><small>{t('about.philipp')}</small></p>
                    </div>
                    <div class='team_member'>
                        <img src='sophie.png' class='team_images'></img>
                        <p class='team_member_description'>Sophie Pichler<br></br><small>{t('about.sophie')}</small></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;