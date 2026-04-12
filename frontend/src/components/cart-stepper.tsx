const steps = ["Количка", "Доставка", "Потвърждение"];

function StepMarker({
  index,
  currentStep,
  isComplete,
  isClickable,
  onSelect,
}: {
  index: number;
  currentStep: number;
  isComplete: boolean;
  isClickable: boolean;
  onSelect?: (step: number) => void;
}) {
  const isActive = index === currentStep;
  const canClick = isClickable && index < 2;

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
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
          isComplete || isActive
            ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
            : "border border-[#d8d0de] bg-white text-[#8f72a7]"
          } ${
            canClick && !isActive
              ? "group-hover:border-[#b79ac7] group-hover:text-[#432855]"
              : ""
          }`}
      >
        {index + 1}
      </span>
      <span
        className={`text-sm font-medium transition-colors ${
          isActive ? "text-[#432855]" : "text-[#8f72a7]"
        } ${canClick && !isActive ? "group-hover:text-[#432855]" : ""}`}
      >
        {steps[index]}
      </span>
    </button>
  );
}

export function CartStepper({
  currentStep,
  orderCompleted,
  onStepSelect,
}: {
  currentStep: number;
  orderCompleted: boolean;
  onStepSelect?: (step: number) => void;
}) {
  return (
    <div className="pb-2">
      <div className="flex flex-col gap-2 sm:hidden">
        {steps.map((step, index) => {
          const isComplete = index < currentStep || (index === 2 && orderCompleted);

          return (
            <div key={step} className="flex items-stretch gap-3">
              <div className="flex w-9 shrink-0 flex-col items-center">
                <div className="h-9 w-px" />
                {index < steps.length - 1 ? (
                  <span className="mt-1 h-6 w-px bg-[#ddd3e4]" />
                ) : null}
              </div>
              <div className="-ml-12">
                <StepMarker
                  index={index}
                  currentStep={currentStep}
                  isComplete={isComplete}
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
