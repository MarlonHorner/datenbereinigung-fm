import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard } from '@/context/WizardContext';
import { WIZARD_STEPS } from '@/types/organization';

interface WizardNavigationProps {
  onNext?: () => boolean | void; // Rückgabe false verhindert Navigation
}

const WizardNavigation = ({ onNext }: WizardNavigationProps) => {
  const { state, nextStep, prevStep, canGoNext } = useWizard();
  const { currentStep } = state;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const handleNext = () => {
    if (onNext) {
      const result = onNext();
      if (result === false) return;
    }
    nextStep();
  };

  return (
    <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
      <Button
        variant="outline"
        onClick={prevStep}
        disabled={isFirstStep}
        className="gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Zurück
      </Button>

      <div className="text-sm text-muted-foreground">
        Schritt {currentStep + 1} von {WIZARD_STEPS.length}
      </div>

      {!isLastStep ? (
        <Button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="gap-2"
        >
          Weiter
          <ChevronRight className="w-4 h-4" />
        </Button>
      ) : (
        <Button onClick={handleNext} className="gap-2">
          Abschließen
        </Button>
      )}
    </div>
  );
};

export default WizardNavigation;
