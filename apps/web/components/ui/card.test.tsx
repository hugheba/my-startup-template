import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

describe('Card', () => {
  // Card is six components that only earn their keep composed. This asserts the
  // whole set exports and nests, which is the thing that breaks when one of the
  // six is dropped from the export list at the bottom of card.tsx — a mistake
  // TypeScript catches at the import site but not if a barrel re-export masks it.
  it('composes its parts and renders their children', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Starter</CardTitle>
          <CardDescription>For side projects</CardDescription>
        </CardHeader>
        <CardContent>$0 / month</CardContent>
        <CardFooter>Cancel anytime</CardFooter>
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    for (const text of ['Starter', 'For side projects', '$0 / month', 'Cancel anytime']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(card).toContainElement(screen.getByText('Starter'));
  });

  // Same twMerge guarantee as Button, checked on a different base class so a
  // regression in cn() cannot pass here by coincidence: `rounded-xl` is Card's
  // own, and a caller asking for `rounded-none` must win.
  it('lets a caller className override a conflicting base class', () => {
    render(
      <Card className="rounded-none" data-testid="card">
        body
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-none');
    expect(card).not.toHaveClass('rounded-xl');
  });

  // Arbitrary props must reach the DOM node through the spread — this is how
  // callers attach aria-* and data-* attributes, and the spread is easy to drop
  // when someone adds a new destructured prop.
  it('passes arbitrary props through to the rendered element', () => {
    render(
      <Card aria-label="Pricing tier" data-testid="card">
        body
      </Card>,
    );

    expect(screen.getByTestId('card')).toHaveAttribute('aria-label', 'Pricing tier');
  });

  it('forwards its ref to the underlying element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>body</Card>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
