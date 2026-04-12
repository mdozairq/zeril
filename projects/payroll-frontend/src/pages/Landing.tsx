import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import '../styles/landing.css'
import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import MarqueeStrip from '../components/landing/MarqueeStrip'
import ProblemSection from '../components/landing/ProblemSection'
import SolutionSection from '../components/landing/SolutionSection'
import HowItWorks from '../components/landing/HowItWorks'
import FeaturesSection from '../components/landing/FeaturesSection'
import DeveloperSection from '../components/landing/DeveloperSection'
import WhyAlgorand from '../components/landing/WhyAlgorand'
import CTASection from '../components/landing/CTASection'
import CinematicFooter from '../components/landing/CinematicFooter'

export default function Landing() {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()

  const onLaunchApp = () => {
    const savedRole = localStorage.getItem('zeril_role')
    if (activeAddress && savedRole) {
      navigate(savedRole === 'employee' ? '/employee' : '/company')
    } else {
      navigate('/role-select')
    }
  }

  return (
    <div className="landing">
      <div className="relative z-10 bg-[#0A0A0A] landing-grain">
        <Navbar onLaunchApp={onLaunchApp} />
        <HeroSection onLaunchApp={onLaunchApp} />
        <MarqueeStrip />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <FeaturesSection />
        <DeveloperSection />
        <WhyAlgorand />
        <CTASection onLaunchApp={onLaunchApp} />
      </div>

      <CinematicFooter onLaunchApp={onLaunchApp} />
    </div>
  )
}
