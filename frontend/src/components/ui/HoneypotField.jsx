/**
 * Invisible decoy input for catching form-spam bots.
 *
 * Hidden with an off-screen clip rather than `display:none` or `hidden`: many
 * bots skip fields the browser would not render, so an obviously-hidden input
 * catches far less. To a human this is unreachable — no tab stop, excluded from
 * the accessibility tree, autocomplete disabled so the browser never fills it.
 *
 * The server checks the matching field in middleware/honeypot.js; changing the
 * name here means changing it there too.
 */
export const HONEYPOT_FIELD = 'website';

export default function HoneypotField({ value, onChange }) {
    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap',
                border: 0,
            }}
        >
            <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
            <input
                id={HONEYPOT_FIELD}
                name={HONEYPOT_FIELD}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={value}
                onChange={onChange}
            />
        </div>
    );
}
