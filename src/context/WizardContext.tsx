import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Organization, ContactPerson, Heyflow, WizardState } from '@/types/organization';
import { saveWizardState, loadWizardState, getInitialState } from '@/lib/storage';

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'LOAD_STATE'; state: WizardState }
  | { type: 'SET_ORGANIZATIONS'; organizations: Organization[] }
  | { type: 'UPDATE_ORGANIZATION'; id: string; updates: Partial<Organization> }
  | { type: 'SET_HEYFLOWS'; heyflows: Heyflow[] }
  | { type: 'SET_CONTACT_PERSONS'; contactPersons: ContactPerson[] }
  | { type: 'ADD_CONTACT'; contact: ContactPerson }
  | { type: 'SET_DATA_LOADED'; loaded: boolean }
  | { type: 'RESET' };

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'LOAD_STATE':
      return action.state;
    case 'SET_ORGANIZATIONS':
      return { ...state, organizations: action.organizations, isDataLoaded: true };
    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        organizations: state.organizations.map(org =>
          org.id === action.id
            ? { ...org, ...action.updates, updatedAt: new Date().toISOString() }
            : org
        ),
      };
    case 'SET_HEYFLOWS':
      return { ...state, heyflows: action.heyflows };
    case 'SET_CONTACT_PERSONS':
      return { ...state, contactPersons: action.contactPersons };
    case 'ADD_CONTACT':
      return { ...state, contactPersons: [...state.contactPersons, action.contact] };
    case 'SET_DATA_LOADED':
      return { ...state, isDataLoaded: action.loaded };
    case 'RESET':
      return getInitialState();
    default:
      return state;
  }
};

interface WizardContextType {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: () => boolean;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wizardReducer, getInitialState());

  // Zustand beim Start laden
  useEffect(() => {
    const loadState = async () => {
      const savedState = await loadWizardState();
      if (savedState) {
        dispatch({ type: 'LOAD_STATE', state: savedState });
      }
    };
    loadState();
  }, []);

  // Zustand bei Änderungen speichern
  useEffect(() => {
    if (state.isDataLoaded) {
      saveWizardState(state).catch(error => {
        console.error('Fehler beim Speichern des Wizard-Status:', error);
      });
    }
  }, [state]);

  const goToStep = (step: number) => {
    if (step >= 0 && step <= 7) {
      dispatch({ type: 'SET_STEP', step });
    }
  };

  const nextStep = () => {
    if (state.currentStep < 7) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
    }
  };

  const prevStep = () => {
    if (state.currentStep > 0) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  };

  const canGoNext = (): boolean => {
    // Validierung je nach Schritt
    switch (state.currentStep) {
      case 0: // Upload
        return state.organizations.length > 0;
      case 1: // Klassifizierung
        return state.organizations.every(o => o.type !== null);
      default:
        return true;
    }
  };

  return (
    <WizardContext.Provider value={{ state, dispatch, goToStep, nextStep, prevStep, canGoNext }}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = (): WizardContextType => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard muss innerhalb von WizardProvider verwendet werden');
  }
  return context;
};
