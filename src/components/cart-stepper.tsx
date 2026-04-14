const steps = ["Количка", "Доставка", "Потвърждение"];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 10.5 8 14l7.5-8" />
    </svg>
  );
}

function StepMarker({
  index,
  currentStep,
  isComplete,
  hasError,
  isClickable,
  onSelect,
}: {
  index: number;
  currentStep: number;
  isComplete: boolean;
  hasError: boolean;
  isClickable: boolean;
  onSelect?: (step: number) => void;
}) {
  const isActive = index === currentStep;
  const canClick = isClickable && index < 2;

  let markerClass: string;
  if (hasError) {
    markerClass = "bg-[linear-gradient(100deg,#e86969_0%,#c43c3c_100%)] text-white ring-2 ring-[#c43c3c] ring-offset-2 ring-offset-white shadow-[0_0_22px_8px_rgba(196,60,60,0.38)]";
  } else if (isComplete) {
    markerClass = "bg-[linear-gradient(100deg,#2e7d65_0%,#1a5540_100%)] text-white";
  } else if (isActive) {
    markerClass = "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white ring-2 ring-[#9f79ac] ring-offset-2 ring-offset-white shadow-[0_0_22px_8px_rgba(159,121,172,0.45)]";
  } else {
    markerClass = "border border-[#d8d0de] bg-white text-[#8f72a7]";
  }

  const labelClass = hasError
    ? "text-[#c43c3c]"
    : isActive
      ? "text-[#432855]"
      : "text-[#8f72a7]";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(index)}
      disabled={!canClick}
      className={`group flex items-center gap-3 text-left ${
        canClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${markerClass} ${
          canClick && !isActive && !hasError
            ? "group-hover:border-[#b79ac7] group-hover:text-[#432855]"
            : ""
        }`}
      >
        {isComplete && !hasError ? <CheckIcon /> : index + 1}
      </span>
      <span
        className={`text-sm font-medium transition-colors ${labelClass} ${
          canClick && !isActive && !hasError ? "group-hover:text-[#432855]" : ""
        }`}
      >
        {steps[index]}
      </span>
    </button>
  );
}

export function CartStepper({
  currentStep,
  orderCompleted,
  stepErrors = {},
  onStepSelect,
}: {
  currentStep: number;
  orderCompleted: boolean;
  stepErrors?: Partial<Record<number, boolean>>;
  onStepSelect?: (step: number) => void;
}) {
  return (
    <div className="pb-2">
      <div className="flex flex-col gap-1.5 sm:hidden">
        {steps.map((step, index) => {
          const isComplete = index < currentStep || (index === 2 && orderCompleted);

          return (
            <div key={step} className="flex items-stretch gap-2.5">
              <div className="flex w-9 shrink-0 flex-col items-center">
                <div className="h-7 w-px" />
                {index < steps.length - 1 ? (
                  <span className="mt-0.5 h-4 w-px bg-[#ddd3e4]" />
                ) : null}
              </div>
              <div className="-ml-12">
                <StepMarker
                  index={index}
                  currentStep={currentStep}
                  isComplete={isComplete}
                  hasError={Boolean(stepErrors[index])}
                  isClickable={Boolean(onStepSelect)}
                  onSelect={onStepSelect}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden items-center sm:flex">
        {steps.map((step, index) => (
          <div key={step} className="flex min-w-0 flex-1 items-center gap-4">
            <StepMarker
              index={index}
              currentStep={currentStep}
              isComplete={index < currentStep || (index === 2 && orderCompleted)}
              hasError={Boolean(stepErrors[index])}
              isClickable={Boolean(onStepSelect)}
              onSelect={onStepSelect}
            />
            {index < steps.length - 1 ? (
              <span className="h-px flex-1 bg-[#ddd3e4]" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
