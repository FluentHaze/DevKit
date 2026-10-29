import {
  Children,
  isValidElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type OptionHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface SelectProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'value' | 'onChange' | 'onSelect' | 'onClick' | 'onKeyDown'
> {
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  wrapperClassName?: string;
  leading?: ReactNode;
  displayValue?: ReactNode;
}
interface Choice {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
}
interface Placement {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  above: boolean;
}
function nodeText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child): string =>
      isValidElement<{ children?: ReactNode }>(child)
        ? nodeText(child.props.children)
        : String(child)
    )
    .join('');
}

export function Select({
  value,
  onValueChange,
  children,
  className = '',
  wrapperClassName = '',
  leading,
  displayValue,
  disabled,
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listId = `${triggerId}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const [target, setTarget] = useState<Element>();
  const [placement, setPlacement] = useState<Placement>();
  const options: Choice[] = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) ||
      child.type !== 'option' ||
      child.props.hidden
    )
      return [];
    return [
      {
        value: String(child.props.value ?? nodeText(child.props.children)),
        label: child.props.children,
        text: child.props.label ?? nodeText(child.props.children),
        disabled: Boolean(child.props.disabled),
      },
    ];
  });
  const selected = options.findIndex((option) => option.value === String(value));
  const enabled = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const measure = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const gap = 6;
    const below = window.innerHeight - rect.bottom - margin - gap;
    const aboveSpace = rect.top - margin - gap;
    const above = below < 160 && aboveSpace > below;
    const width = Math.min(Math.max(rect.width, 176), window.innerWidth - margin * 2);
    setPlacement({
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
      top: above ? rect.top - gap : rect.bottom + gap,
      width,
      maxHeight: Math.max(0, Math.min(320, above ? aboveSpace : below)),
      above,
    });
  }, []);
  const show = (index = selected >= 0 && !options[selected]?.disabled ? selected : enabled[0]) => {
    if (disabled || index === undefined) return;
    measure();
    // 普通页面浮层移到 body；模态框内保留在 top layer 中，避免被 dialog 遮挡。
    setTarget(trigger.current?.closest('dialog[open]') ?? document.body);
    setActive(index);
    setOpen(true);
  };
  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    search.current = { text: '', time: 0 };
    if (restoreFocus) trigger.current?.focus();
  }, []);
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    close(true);
    if (option.value !== String(value)) onValueChange(option.value);
  };
  useLayoutEffect(() => {
    if (!open) return;
    if (disabled) {
      close();
      return;
    }
    const outside = (event: Event) => {
      const path = event.composedPath();
      if (
        !(trigger.current && path.includes(trigger.current)) &&
        !(popup.current && path.includes(popup.current))
      )
        close();
    };
    const reposition = (event?: Event) => {
      if (event?.target instanceof Node && popup.current?.contains(event.target)) return;
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight) close();
      else measure();
    };
    const resize = new ResizeObserver(() => reposition());
    if (trigger.current) resize.observe(trigger.current);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside, true);
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      resize.disconnect();
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside, true);
      document.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, disabled, measure, close]);
  useLayoutEffect(() => {
    if (open)
      popup.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setKeyboard(true);
      if (!enabled.length) return;
      if (event.key === 'Home') {
        show(enabled[0]);
        return;
      }
      if (event.key === 'End') {
        show(enabled.at(-1));
        return;
      }
      if (!open) {
        show();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const position = enabled.indexOf(active);
      setActive(enabled[(position + step + enabled.length) % enabled.length]);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(active);
      return;
    }
    if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setKeyboard(true);
      const now = Date.now();
      const text = now - search.current.time < 700 ? search.current.text + event.key : event.key;
      search.current = { text, time: now };
      const query = [...text].every((char) => char === text[0]) ? text[0] : text;
      const start = open ? active : selected;
      const order = [
        ...enabled.filter((index) => index > start),
        ...enabled.filter((index) => index <= start),
      ];
      const found = order.find((index) =>
        options[index].text.toLocaleLowerCase().startsWith(query.toLocaleLowerCase())
      );
      if (found !== undefined) {
        if (open) setActive(found);
        else show(found);
      }
    }
  };
  return (
    <span className={`relative block min-w-0 ${wrapperClassName}`}>
      <button
        {...props}
        ref={trigger}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-describedby={[props['aria-describedby'], `${triggerId}-value`]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={() => {
          setKeyboard(false);
          if (open) close();
          else show();
        }}
        className={`flex min-h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-start text-[13px] text-primary transition-colors outline-none hover:bg-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-45 ${open ? 'border-accent/50 bg-muted' : ''} ${className}`}
      >
        {leading}
        <span id={`${triggerId}-value`} className="min-w-0 flex-1 truncate">
          {displayValue ?? options[selected]?.label ?? ''}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className={`shrink-0 text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open &&
        target &&
        placement &&
        createPortal(
          <div
            ref={popup}
            id={listId}
            role="listbox"
            aria-label={props['aria-label']}
            aria-labelledby={props['aria-label'] ? undefined : triggerId}
            className="fixed z-50 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface/95 p-1 shadow-overlay backdrop-blur-xl"
            style={{
              left: placement.left,
              top: placement.top,
              width: placement.width,
              maxHeight: placement.maxHeight,
              transform: placement.above ? 'translateY(-100%)' : undefined,
            }}
            onPointerDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === String(value)}
                aria-disabled={option.disabled || undefined}
                data-index={index}
                onPointerMove={() => {
                  if (!option.disabled) {
                    setKeyboard(false);
                    setActive(index);
                  }
                }}
                onClick={() => choose(index)}
                className={`flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] leading-5 transition-colors ${option.disabled ? 'cursor-not-allowed text-secondary opacity-45' : option.value === String(value) ? 'cursor-pointer bg-accent-subtle text-accent hover:bg-accent-subtle' : 'cursor-pointer text-primary hover:bg-muted'} ${keyboard && active === index && option.value !== String(value) ? 'bg-muted' : ''}`}
              >
                <span className="min-w-0 flex-1 break-words">{option.label}</span>
                <Check
                  aria-hidden="true"
                  size={15}
                  className={`shrink-0 text-accent ${option.value === String(value) ? '' : 'invisible'}`}
                />
              </div>
            ))}
          </div>,
          target
        )}
    </span>
  );
}
