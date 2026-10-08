import { createCn } from 'cn/config';

/**
 * Class merging aware of our custom theme tokens (globals.css). Without this, `cn` treats
 * `text-heading` as a colour and drops it next to `text-ink`. Register new tokens here.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['subheading', 'heading', 'title', 'display-sm', 'display'] }],
      rounded: [{ rounded: ['card', 'button'] }],
      tracking: [{ tracking: ['heading'] }],
    },
  },
});
