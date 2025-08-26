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

  // Removed ASN Validator menu
  menuItems = [
    { icon: 'history', text: 'Chat History', view: 'history' }
  ];

  onSidebarClick(event: any) {
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
