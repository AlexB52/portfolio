import { Controller } from "stimulus"

export default class extends Controller {
  static targets = ["image"]

  connect() {
    this.displayImage()
  }

  displayImage() {
    this.imageTarget.style.display = this.display
  }

  get display() {
    return this.data.get('display');
  }
}