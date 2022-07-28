import './AboutComponent.css';
import { Trans, useTranslation } from 'react-i18next';
import { BrowserView, MobileView } from 'react-device-detect';

function About(props) {
    const { t, i18n } = useTranslation();
    return (
        <div>
        <BrowserView>
            <div class='content about'>
                <div className='wrapper_centered_box text'>
                    <h2>{t('about.netidee.top')}</h2>
                    <p class='subheading'>{t('about.netidee.sub')}</p>
                    <Trans i18nKey='about.content' components={{ italic: <i />, bold: <strong />, a: <a /> }}/>
                    <h2>Team</h2>
                    <div class='team'>
                        <div class='team_member'>
                            <img src='teammembers/ohrhallinger_stefan.png' class='team_images'></img>
                            <p class='team_member_description'>Stefan Ohrhallinger<br></br><small class="title">{t('about.stefan')}</small></p>
                        </div>
                        <div class='team_member'>
                            <img src='teammembers/erler_philipp.png' class='team_images'></img>
                            <p class='team_member_description'>Philipp Erler<br></br><small class="title">{t('about.philipp')}</small></p>
                        </div>
                        <div class='team_member'>
                            <img src='teammembers/riegler_maximilian.png' class='team_images'></img>
                            <p class='team_member_description'>Maximilian Riegler<br></br><small class="title">{t('about.maximilian')}</small></p>
                        </div>
                        <div class='team_member'>
                            <img src='teammembers/eschner_johannes.png' class='team_images'></img>
                            <p class='team_member_description'>Johannes Eschner<br></br><small class="title">{t('about.johannes')}</small></p>
                        </div>
                        <div class='team_member'>
                            <img src='teammembers/steinschorn_florian.png' class='team_images'></img>
                            <p class='team_member_description'>Florian Steinschorn<br></br><small class="title">{t('about.florian')}</small></p>
                        </div>
                        <div class='team_member'>
                            <img src='teammembers/pichler_sophie.png' class='team_images'></img>
                            <p class='team_member_description'>Sophie Pichler<br></br><small class="title">{t('about.sophie')}</small></p>
                        </div>
                    </div>
                </div>
            </div>
        </BrowserView>
        <MobileView>
            <div>
                <div class='mobile_text'>
                    <h2>{t('about.netidee.top')}</h2>
                    <p class='subheading'>{t('about.netidee.sub')}</p>
                    <Trans i18nKey='about.content' components={{ italic: <i />, bold: <strong />, a: <a /> }}/>
                </div>
            </div>
        </MobileView>
        </div>
    );
}

export default About;