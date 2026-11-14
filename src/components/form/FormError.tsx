import { FORM_ERROR_ID } from './field-error';

/** The form-level error. Invalid fields point at it with aria-describedby. */
export default function FormError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <div id={FORM_ERROR_ID} role="alert" className="alert alert--danger">
      {message}
    </div>
  );
}
