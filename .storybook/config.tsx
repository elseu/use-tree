import { checkA11y } from '@storybook/addon-a11y';
import { configureActions } from '@storybook/addon-actions';
import { withKnobs } from '@storybook/addon-knobs';
import { addDecorator, addParameters, configure } from '@storybook/react';

addParameters({
  options: {
    name: 'useBinding'
  },
});

configureActions({
  depth: 100,
  // Limit the number of items logged into the actions panel
  clearOnStoryChange: true,
  limit: 50,
});

addDecorator(withKnobs);
addDecorator(checkA11y);

// automatically import all files ending in *.stories.js
const req = require.context('../src', true, /\.stories\.(tsx)$/);

function loadStories() {
  req.keys().forEach((filename) => req(filename));
}

configure(loadStories, module);
