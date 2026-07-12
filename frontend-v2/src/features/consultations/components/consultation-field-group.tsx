import { forwardRef, type TextareaHTMLAttributes } from "react";

type ConsultationFieldGroupProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; description: string; error?: string; required?: boolean };

export const ConsultationFieldGroup = forwardRef<HTMLTextAreaElement, ConsultationFieldGroupProps>(function ConsultationFieldGroup({ label, description, error, required, ...props }, ref) {
  return <label className="consultation-field"><div><span>{label}{required && <b aria-hidden="true"> *</b>}</span><p>{description}</p></div><div><textarea ref={ref} aria-invalid={Boolean(error)} {...props} />{error && <span role="alert" className="field-error">{error}</span>}</div></label>;
});
