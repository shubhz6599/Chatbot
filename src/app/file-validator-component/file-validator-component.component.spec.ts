import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileValidatorComponentComponent } from './file-validator-component.component';

describe('FileValidatorComponentComponent', () => {
  let component: FileValidatorComponentComponent;
  let fixture: ComponentFixture<FileValidatorComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FileValidatorComponentComponent]
    });
    fixture = TestBed.createComponent(FileValidatorComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
