import fetch from 'node-fetch';
import { extractProRcpUrl } from './vm-extractor-enhanced.js';

// Sample HTML content with the jQuery iframe pattern from the task description
const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js"></script>
    
    <div id="pop_asdf">Popup</div>
    <div id="the_frame"></div>
    
    <script>
    /*
    $(document).ready(function(){
        
        
        if($.cookie('pop_asdf')){
            $("#pop_asdf").addClass("hidden");
        }
        
        $("#pop_asdf").click(function(){
            if(!$.cookie('pop_asdf')){
                if($.cookie('pop_asdf_tmp') >= 3){
                    var date = new Date();
                    date.setTime(date.getTime() + (10800 * 1000));
                    $.cookie('pop_asdf', 1, { expires: date });
                    $("#pop_asdf").addClass("hidden");
                }else{
                    var cookie_value = 1;
                    if($.cookie('pop_asdf_tmp'))
                        cookie_value = $.cookie('pop_asdf_tmp');
                        
                    cookie_value++;
                    
                    $.cookie('pop_asdf_tmp', cookie_value);
                    $(this).addClass("hidden");
                    setTimeout(function(){
                        $("#pop_asdf").removeClass("hidden");
                    }, 59000);
                }
            }
        });
    });
    */
    
        
    $("#pl_but_background , #pl_but").click(function(){
        loadIframe();
    });
    
        
    function loadIframe(data = 1){
        if(data == 1){
            $("#the_frame").removeAttr("style");
            $("#the_frame").html("");
            $('<iframe>', {
               id: 'player_iframe',
               src: '/prorcp/NGUwNWM0MjU1OGQzN2FmZmJiNWI2NjAxYzE1ODAxYTE6VG1SaksySTRaMVFyTkV4RVExQlVaaTh2TjAxTGFubFhNUzl5WkcxU2NFVkdUMHRHUjB4WkwydE5iM0pITUROdmIzRTVVbUZ2YW1kRGIzUXZXVTVpSzBsSk1ITjRMMjQ1V0dKWWNuUnpiVlJoYmxaelNXZE1iVVJXUm00MVlXWndVMnhCTkVoRFMyaEVRV3N4ZEVRcmJIZExkR3hDUzFOUU9XaHRTMHRWVFVKS1QwVm9RVE5tYjJrMVNHVnpNU3RIT0cxR1JtaENSME4xY25KdWNYQlFaMnhqYlZOc1VGSkdMMWxqVTNOaVJHVlZVbEZvVDFrNVEwUXJTbXd5UjA5WU9WRkRiV2h0WWpsQk1rUnZMMWxsTjI5dE5raDRjekphY1dsYU5VeFBXbE51TlZkM1dtZFZaM2xpZEV4WFkwZFdLMEZaYjAxQlFraFFNblJJY0VWcVN6WmtkU3ROUWpaQlZWVXdhbGwzTkVoRlJHazNZV2h6UlROM1lsSTVSbVp5VWpoV1FWSTVlVGx4YTI5RU9GVjNTelZ2UjNCdFkxWkdNVnB1UzJoeU5rdE9PRVF2ZUcwNE9GSktWblZRY0d4SlkyTnNZa3hwYjNBNWFXODBUMmR4YUhKcVRtZHdablpoZURWbGNrZDBUR2xTUjBGb1ZETXJTM2xCYlZvd1YxRkJMMVZPV1ZsU1NsVlhSMnR2ZUhWUmFsbEtiM2h2WVRWdmJWVnBiVFIwYVN0RmRrTkZlVmh5T0dKUVlqUlhkMkZNUVU4M1QzQmhiekphVXpSUlYxY3JZMjVhTWs1cmQwVm5TWGRDUnpWWmFISTJORFpQYnpSM1dVMXRTa013Y1dGdmJqSkllWHBYWlhsU04zQkZTME5uYnl0elFXVnlSMEZpTkVscmNqZFBhMmwyZFRaMGNITmliRlJJUW1SaGN6UlZiVU4yT0ZWVGIxZHlhamhNU0RaRVJuZEJZalp2YjFKTk1qbGlXVEpFYlRsd1MzcDVTMWRETlU5clRUVk5TSE53Tm05d05sRTJOalZqU0hsNmNYZzFZVTltTW10eFdHdHJMMXA1TUZobWJtWk1kSGRMSzB3eU4yRnRORUpyUWxGc1pHVnhVMGx2U0hKc1NVTmhVRVU0VFRZeVdHWmlSRVpETkhsUU0wZzBiaXRJTURJMllrMHJURkpLU2sxSFlsUjBXbUl4UjAwMlFWWnViMUJ6YjA5b1ZqWkNURzV3WjJwWWJDOWtZbmwzSzBwQldFRlBlSEZuUjFGcFNGbGpUamRWWTB4Qk5ERXJjVTlTZDFwNFVsaExWVzluYVRRNFNuTkhUM05VWVVNNFUwRjZVM1ZETUZWbVdEWkJVa2xJZUZwUkszTm5UV2xZUmpsTmNGQTBVM05rVURaT2J5OTJiR1ZWZWk5blZGZGtUekZhV1dGdFZtcHJjRGhQWjBGSGNrcEdPVFV3S3pOYVNtTXJhMU5oYkVkT05sWnNNVTFPTWk5WWN6bE9lRk5yUTFwSGNEQkhjREJsYjBGeVlXaGpXRm96ZGpORU1tNXBWbkF5ZVVzdk9FWTFjbGR4Um5vMkwwdEdLME5NWTFsa2FUbGxVblF3ZWpORFpGVjZSRlYzYTFRNWVrdEJlVVpNU0ZwdmJsWmhjRlV4TkhwTVNIVmpSazh5WWpoUk1FZzRiMDVpYlVkUGRFTjZTVVI0WVhCTWVsaFRTbTFXWWpSRGIyaHhiMFZUZDFkYU1TOXdkbk14YlhOaWRGb3ZNeTlEVWtGeU5WZzBNbFZxYWtOaVZqaFVTMnhuSzNwM1pFbEVNM2RFTkUxMk1FTlhlVTE1WWpsb1JURlVObkJaYXk5WVIxQnplRkJ2ZUc1d09EUllTUzlFUld4TmRYWXlZa0YzV2psdE5GaGpUSEZUSzFsMk9UaGhiMWxSZFRsSWRYVTFhMjR5UmtSMFkzVlVZbFpTYUhRMlpXaGxNRFJ2YUVKSVprRkVaVk56YlUwelFsVkVaR053YzBsaFZHWkVkVTVtTVhoeFIyVmxjbFpxZVdaSlRpdHhVbWcyUjNWcmVIRktVMDF2TjFVNEszTXZUVTB2UVdWdFZIWkxlblowY25CTmFqaFNkSE5wYlVwS09GVm9RVDA9',
               frameborder: 0,
               scrolling: 'no',
               allowfullscreen: 'yes',
               allow: "autoplay",
               style: 'height: 100%; width: 100%;'
            }).appendTo('#the_frame');
            $("#player_iframe").on("load", function () {
                $("#the_frame").attr("style","background-image: none;");
            });
        }
    }
    
    // pm redirector
    window.addEventListener('message', message => {
        if (message.source == window) {
            return; // Skip message in this event listener
        }
        
        var the_iframe = document.getElementById('player_iframe');
        
        if(message.source == window.parent){
            the_iframe.contentWindow.postMessage(message.data,'*');
        }else{
            window.parent.postMessage(message.data , '*');
        }
    });
    </script>
</body>
</html>
`;

async function testProRcpExtraction() {
    console.log('Testing ProRCP URL extraction...');
    
    // Test the extraction function with our sample HTML
    const logger = {
        info: (message, data) => console.log(`INFO: ${message}`, data || ''),
        error: (message, data) => console.log(`ERROR: ${message}`, data || '')
    };
    
    try {
        const prorcpUrl = extractProRcpUrl(sampleHtml, logger);
        
        if (prorcpUrl) {
            console.log('SUCCESS: ProRCP URL extracted:', prorcpUrl);
            
            // Try to fetch the URL to verify it works
            console.log('Attempting to fetch the ProRCP URL...');
            try {
                const response = await fetch(prorcpUrl);
                console.log('Fetch response status:', response.status);
                if (response.ok) {
                    console.log('SUCCESS: ProRCP URL is accessible');
                } else {
                    console.log('WARNING: ProRCP URL returned status', response.status);
                }
            } catch (fetchError) {
                console.log('WARNING: Could not fetch ProRCP URL:', fetchError.message);
            }
        } else {
            console.log('ERROR: Failed to extract ProRCP URL');
        }
    } catch (error) {
        console.log('ERROR: Exception during extraction:', error.message);
    }
}

// Run the test
testProRcpExtraction();