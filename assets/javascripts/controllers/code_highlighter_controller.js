import hljs from 'highlight.js/lib/core';
import ruby from 'highlight.js/lib/languages/ruby';
import erb from 'highlight.js/lib/languages/erb';

import { Controller } from "stimulus"

export default class extends Controller {
  static targets = ["ruby", "erb"]

  initialize() {
    hljs.registerLanguage('ruby', ruby);
    hljs.registerLanguage('erb', erb);
  }

  connect() {
    this.initializeRuby()
    this.initializeERB()
  }

  initializeRuby() {
    this.rubyTargets.forEach(block => hljs.highlightBlock(block, ruby))
  }

  initializeERB() {
    this.erbTargets.forEach(block => hljs.highlightBlock(block, erb))
  }
}