import { render } from 'preact'
import './index.css'
import { LoadError } from './load-error.tsx'

const root = document.getElementById('app')!

// The app module waits for the tournament data (/data/*.json) before it evaluates, so import it
// dynamically: if the data can't be loaded (offline on a first visit, say) we can still show a message.
import('./app.tsx')
  .then(({ App }) => {
    root.textContent = '' // remove the loading message from index.html
    render(<App />, root)
  })
  .catch((error: unknown) => {
    console.error(error)
    root.textContent = ''
    render(<LoadError />, root)
  })
