import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/types/organization';
import { useWizard } from '@/context/WizardContext';

const WizardStepper = () => {
  const { state, goToStep } = useWizard();
  const currentStep = state.currentStep;

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step Circle */}
              <button
                onClick={() => goToStep(index)}
                disabled={isPending && index > currentStep + 1}
                className={cn(
                  'step-indicator transition-all duration-300',
                  isCompleted && 'step-complete',
                  isActive && 'step-active ring-4 ring-primary/20',
                  isPending && 'step-pending',
                  !isPending && 'cursor-pointer hover:scale-110'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Step Label (nur auf größeren Bildschirmen) */}
              <div className="hidden lg:block ml-3 mr-8">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive && 'text-primary',
                    isCompleted && 'text-success',
                    isPending && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector Line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div className="flex-1 hidden sm:block mx-2">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-colors duration-300',
                      isCompleted ? 'bg-success' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Step Label */}
      <div className="lg:hidden mt-4 text-center">
        <p className="text-sm font-medium text-primary">
          Schritt {currentStep + 1}: {WIZARD_STEPS[currentStep]?.label}
        </p>
      </div>
    </div>
  );
};

export default WizardStepper;
