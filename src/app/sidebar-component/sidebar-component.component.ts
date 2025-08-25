import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-sidebar-component',
  templateUrl: './sidebar-component.component.html',
  styleUrls: ['./sidebar-component.component.css']
})
export class SidebarComponentComponent {
   @Input() collapsed: boolean = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() changeView = new EventEmitter<string>();

  menuItems = [
    { icon: 'chat', text: 'Chat', view: 'chat' },
    { icon: 'history', text: 'Chat History', view: 'history' },
    { icon: 'description', text: 'ASN Validator', view: 'validator' }
  ];

  onSidebarClick(event: any) {
    // Only open sidebar if it's currently closed and the click wasn't on the toggle button
    if (this.collapsed && !event.target.closest('.toggle-btn')) {
      this.toggleSidebar.emit();
    }
  }

  onToggleClick(event: any) {
    event.stopPropagation();
    this.toggleSidebar.emit();
  }

  onMenuItemClick(view: string, event: any) {
    event.stopPropagation();
    this.changeView.emit(view);
  }
}
