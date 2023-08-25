import './AboutComponent.css';
import { Trans, useTranslation } from 'react-i18next';
import { BrowserView, MobileView } from 'react-device-detect';

function About(props) {
    const { t, i18n } = useTranslation();
    return (
        <div>
        <BrowserView>
            <div className='content about'>
                <div className='wrapper_centered_box text'>
                    <h2>{t('about.netidee.top')}</h2>
                    <p className='subheading'>{t('about.netidee.sub')}</p>
                    <Trans i18nKey='about.content' components={{ italic: <i />, bold: <strong />, a: <a /> }}/>
                    <h2>Team</h2>
                    <div className='team'>
                        <div className='team_member'>
                            <img src='teammembers/erler_philipp.png' className='team_images'></img>
                            <p className='team_member_description'>Philipp Erler<br></br><small className="title">{t('about.philipp')}</small></p>
                        </div>
                        <div className='team_member'>
                            <img src='teammembers/riegler_maximilian.png' className='team_images'></img>
                            <p className='team_member_description'>Maximilian Riegler<br></br><small className="title">{t('about.maximilian')}</small></p>
                        </div>
                        <div className='team_member'>
                            <img src='teammembers/eschner_johannes.png' className='team_images'></img>
                            <p className='team_member_description'>Johannes Eschner<br></br><small className="title">{t('about.johannes')}</small></p>
                        </div>
                        <div className='team_member'>
                            <img src='teammembers/steinschorn_florian.png' className='team_images'></img>
                            <p className='team_member_description'>Florian Steinschorn<br></br><small className="title">{t('about.florian')}</small></p>
                        </div>
                        <div className='team_member'>
                            <img src='teammembers/pichler_sophie.png' className='team_images'></img>
                            <p className='team_member_description'>Sophie Pichler<br></br><small className="title">{t('about.sophie')}</small></p>
                        </div>
                        <div className='team_member'>
                            <img src='teammembers/elias_brugger.png' className='team_images'></img>
                            <p className='team_member_description'>Elias Brugger<br></br><small className="title">{t('about.elias')}</small></p>
                        </div>
                        <div className='team_member'>
                            <img src='teammembers/johannes_pauschenwein.png' className='team_images'></img>
                            <p className='team_member_description'>Johannes Pauschenwein<br></br><small className="title">{t('about.johannes_p')}</small></p>
                        </div>
                    </div>
                </div>
            </div>
        </BrowserView>
        <MobileView>
            <div>
                <div className='mobile_text'>
                    <h2>{t('about.netidee.top')}</h2>
                    <p className='subheading'>{t('about.netidee.sub')}</p>
                    <Trans i18nKey='about.content' components={{ italic: <i />, bold: <strong />, a: <a /> }}/>
                </div>
            </div>
        </MobileView>
        </div>
    );
}

export default About;