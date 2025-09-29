import { Component } from '@angular/core';

@Component({
  selector: 'app-faqs',
  templateUrl: './faqs.component.html',
  styleUrls: ['./faqs.component.css']
})
export class FaqsComponent {
  faqs = [
    {
      question: 'How can I change my email/Phone?',
      answer: 'You can change your email or phone by visiting your profile settings and updating your details.',
      type: 'text'
    },
    {
      question: 'How can I reset my password?',
      answer: `Dear User, to reset your MSETU password please follow these steps: Click on Forget Password. Enter your User ID in the format  VendorCodeRole@mahindraext.com. Enter the OTP sent to your registered contact. Set your new password. For a detailed SOP on login, please click <a href="https://r2.trialdemo.uk/pdfs/reset.pdf" target=\"_blank\"> Here</a>.`,
      type: 'text'
    },
    {
      question: 'How can I validate ASN file?',
      answer: 'Upload your ASN file in the ASN Validator section and our assistant will validate it for you.',
      type: 'text'
    },
    {
      question: 'How to open MSETU portal?',
      answer: 'On your browser you can type supplier.mahindra.com or click the button below:',
      link: 'https://supplier.mahindra.com/login',
      type: 'link'
    },
    {
      question: 'How to login MSETU portal Video SOP?',
      videoUrl: 'https://supplier.mahindra.com/MSetu/api/GCPfile/MSetuDocuments/LoginSlider/mSetu_2.mp4',
      type: 'video'
    }
  ];

  expandedIndex: number | null = null;

  toggleFaq(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
