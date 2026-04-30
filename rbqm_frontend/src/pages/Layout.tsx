import { Sidebar } from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import { CommandPalette } from '../components/CommandPalette';
import { OnboardingTour } from '../components/OnboardingTour';

export function Layout() {
  return (
    <div className="flex h-screen w-screen bg-background-base overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="animate-fade-up">
          <Outlet />
        </div>
      </div>
      <CommandPalette />
      <OnboardingTour />
    </div>
  );
}
