import { mount } from 'svelte'
import App from './App.svelte'

const target = document.getElementById('app')
if (!target) { throw new Error('[app] Mount target #app not found in DOM') }
mount(App, { target })
