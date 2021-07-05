import './AboutComponent.css';

function About(props) {
    return (
        <div className='wrapper'>
            <h2>Images2Mesh Web funded by Netidee</h2>
            <p class='about'>A key step in any scanning-based asset creation workflow is to convert unordered point clouds
            to a surface. Classical methods (e.g., Poisson reconstruction) start to degrade in the presence
            of noisy and partial scans. Hence, deep learning based methods have recently been proposed to produce
            complete surfaces, even from partial scans. However, such data-driven methods struggle to generalize
            to new shapes with large geometric and topological variations. We present Points2Surf, a novel
            patch-based learning framework that produces accurate surfaces directly from raw scans without normals.
            Learning a prior over a combination of detailed local patches and coarse global information improves
            generalization performance and reconstruction accuracy.
            Our extensive comparison on both synthetic and real data demonstrates a clear advantage of our method
            over state-of-the-art alternatives on previously unseen classes (on average, Points2Surf brings down
            reconstruction error by 30% over SPR and by 270%+ over deep learning based SotA methods) at the cost
            of longer computation times and a slight increase in small-scale topological noise in some cases.
            Our source code, pre-trained model, and dataset are available on:
            https://github.com/ErlerPhilipp/points2surf</p>
        </div>
    );
}

export default About;