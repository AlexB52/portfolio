import hljs from 'highlight.js/lib/core';
import ruby from 'highlight.js/lib/languages/ruby';
hljs.registerLanguage('ruby', ruby);
import { Controller } from "stimulus"

export default class extends Controller {
  static targets = ["code"]

  connect() {
    this.codeTargets.forEach(block => hljs.highlightBlock(block, ruby))
  }
}