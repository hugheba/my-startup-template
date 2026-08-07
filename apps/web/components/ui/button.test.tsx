import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('renders a real <button> by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  // Guards the `asChild` / Radix Slot wiring. When it breaks, Slot stops
  // merging into the child and renders a <button> wrapping the <a> instead —
  // so `<Button asChild><Link/></Button>`, the standard way this component is
  // used for navigation, silently stops being a link. Nothing type-checks that.
  it('renders the child element instead of a button when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/pricing">Pricing</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // The component-level half of the cn() guarantee that lib/utils.test.ts
  // covers in isolation: a caller's className must beat the variant's own
  // conflicting class. Without twMerge both land in the attribute and the
  // winner is decided by stylesheet order, so this override appears to do
  // nothing at runtime while looking correct in the JSX.
  it('lets a caller className override a conflicting variant class', () => {
    render(<Button className="bg-red-500">Delete</Button>);

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveClass('bg-red-500');
    expect(button).not.toHaveClass('bg-primary');
  });

  // forwardRef is load-bearing rather than decorative: every Radix trigger
  // (Dialog, Popover, Tooltip) positions itself against the ref of the element
  // it wraps. A dropped ref leaves it null and the overlay mispositions to the
  // top-left of the viewport.
  it('forwards its ref to the underlying element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Submit</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveTextContent('Submit');
  });

  // `disabled` arrives through the {...props} spread, so it is only wired if
  // the spread stays after the destructure. The cva class list also carries
  // `disabled:pointer-events-none`; this asserts the behaviour, which is what
  // actually stops a double-submit, rather than the class that styles it.
  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Pay
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
