import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Grid, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Chip,
  Divider,
  Container,
  useTheme,
  useMediaQuery,
  Stack,
  Avatar
} from '@mui/material';
import { financeAPI } from '../services/api';
import { format } from 'date-fns';
import DatePicker from '@mui/lab/DatePicker';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import LinkIcon from '@mui/icons-material/Link';
import AddCircleIcon from '@mui/icons-material/AddCircle';

// Define types
interface PaymentAnnouncement {
  id: number;
  title: string;
  description: string;
  amount: string;
  payment_details: string;
  due_date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface PaymentSubmission {
  id: number;
  announcement_id: number;
  student_id: number;
  payment_slip_url: string;
  amount_paid: string;
  payment_date: string;
  notes: string | null;
  status: string;
  verification_notes: string | null;
  submitted_at: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const StudentPayments: React.FC = () => {
  const [announcements, setAnnouncements] = useState<PaymentAnnouncement[]>([]);
  const [mySubmissions, setMySubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<PaymentAnnouncement | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    payment_slip_url: '',
    amount_paid: '',
    payment_date: new Date().toISOString(),
    notes: ''
  });
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' as 'success' | 'error' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  useEffect(() => {
    fetchAnnouncements();
    fetchMySubmissions();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeAPI.getAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching payment announcements:', err);
      setError('Failed to load payment announcements. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMySubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const data = await financeAPI.getMySubmissions();
      setMySubmissions(data);
    } catch (err) {
      console.error('Error fetching my submissions:', err);
      // Don't set error as it would replace the main component with an error message
      setMessage({ 
        text: 'Failed to load your submissions. Please try again later.', 
        severity: 'error' 
      });
      setShowMessage(true);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleOpenSubmitDialog = (announcement: PaymentAnnouncement) => {
    // Check if student has already submitted a payment for this announcement
    const existingSubmission = mySubmissions.find(
      sub => sub.announcement_id === announcement.id
    );

    if (existingSubmission) {
      setSelectedSubmission(existingSubmission);
      setOpenViewDialog(true);
      return;
    }

    setSelectedAnnouncement(announcement);
    setSubmissionForm({
      payment_slip_url: '',
      amount_paid: announcement.amount, // Pre-fill with the requested amount
      payment_date: new Date().toISOString(),
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAnnouncement(null);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedSubmission(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSubmissionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSubmissionForm(prev => ({
        ...prev,
        payment_date: date.toISOString()
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnnouncement) return;

    try {
      const submissionData = {
        ...submissionForm,
        announcement_id: selectedAnnouncement.id
      };

      await financeAPI.submitPayment(submissionData);
      setMessage({ text: 'Payment submitted successfully!', severity: 'success' });
      setShowMessage(true);
      handleCloseDialog();
      
      // Refresh my submissions
      fetchMySubmissions();
    } catch (err) {
      console.error('Error submitting payment:', err);
      setMessage({ text: 'Failed to submit payment. Please try again.', severity: 'error' });
      setShowMessage(true);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon color="success" />;
      case 'rejected':
        return <CancelIcon color="error" />;
      default:
        return <HourglassEmptyIcon color="warning" />;
    }
  };

  // Find if student has already submitted for an announcement
  const hasSubmittedFor = (announcementId: number) => {
    return mySubmissions.some(sub => sub.announcement_id === announcementId);
  };

  // Get submission status for an announcement
  const getSubmissionStatus = (announcementId: number) => {
    const submission = mySubmissions.find(sub => sub.announcement_id === announcementId);
    return submission ? submission.status : null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Payment Announcements Section */}
      <Box 
        mb={6}
        sx={{
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <Typography 
          variant="h5" 
          component="h2" 
          gutterBottom
          sx={{ 
            fontWeight: 600, 
            mb: 3,
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } 
          }}
        >
          Payment Announcements
        </Typography>
        
        {announcements.length === 0 ? (
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme.palette.grey[50],
              border: `1px dashed ${theme.palette.grey[300]}`,
              height: '200px'
            }}
          >
            <PaymentIcon fontSize="large" color="disabled" sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No payment announcements found.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
            {announcements.map(announcement => {
              const submitted = hasSubmittedFor(announcement.id);
              const status = getSubmissionStatus(announcement.id);
              
              return (
                <Grid item xs={12} key={announcement.id}>
                  <Card 
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: `1px solid ${theme.palette.grey[200]}`,
                      '&:hover': {
                        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
                      },
                      transition: 'box-shadow 0.3s ease-in-out',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        pb: submitted ? 3 : 0,
                      }}
                    >
                      {submitted && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 1,
                          }}
                        >
                          <Chip
                            icon={getStatusIcon(status || 'pending')}
                            label={status?.toUpperCase() || 'PENDING'}
                            color={getStatusColor(status || 'pending') as 'success' | 'warning' | 'error'}
                            sx={{ 
                              fontWeight: 600,
                              px: 1
                            }}
                          />
                        </Box>
                      )}
                    
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ maxWidth: '800px', mx: 'auto', width: '100%' }}>
                          <Typography 
                            variant="h6" 
                            component="h3" 
                            gutterBottom
                            sx={{ 
                              fontWeight: 600,
                              mb: 2,
                              pr: submitted ? 8 : 0, // Space for the status chip
                              textAlign: 'center'
                            }}
                          >
                            {announcement.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="textSecondary" 
                            paragraph
                            sx={{ 
                              mb: 3,
                              textAlign: 'center'
                            }}
                          >
                            {announcement.description}
                          </Typography>
                          
                          <Grid container spacing={2} sx={{ mb: 2, justifyContent: 'center' }}>
                            <Grid item xs={12} sm={6} md={3} lg={3}>
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  backgroundColor: theme.palette.primary.main + '10',
                                  p: 1.5,
                                  borderRadius: 2
                                }}
                              >
                                <PaymentIcon color="primary" sx={{ mr: 1, opacity: 0.7, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="textSecondary">
                                    Amount
                                  </Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {announcement.amount}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3} lg={3}>
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  backgroundColor: theme.palette.error.main + '10',
                                  p: 1.5,
                                  borderRadius: 2
                                }}
                              >
                                <EventIcon color="error" sx={{ mr: 1, opacity: 0.7, fontSize: '1.2rem' }} />
                                <Box>
                                  <Typography variant="caption" color="textSecondary">
                                    Due Date
                                  </Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {formatDate(announcement.due_date)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                          
                          <Box mt={3}>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                mb: 1.5, 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              Payment Details
                            </Typography>
                            <Paper 
                              variant="outlined" 
                              sx={{ 
                                p: 2, 
                                borderRadius: 2, 
                                backgroundColor: theme.palette.grey[50],
                                maxHeight: '150px',
                                overflow: 'auto'
                              }}
                            >
                              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                {announcement.payment_details}
                              </Typography>
                            </Paper>
                          </Box>
                        </Box>
                      </CardContent>
                      
                      <CardActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: 'center' }}>
                        <Button 
                          variant="contained" 
                          color={submitted ? "secondary" : "primary"}
                          onClick={() => handleOpenSubmitDialog(announcement)}
                          startIcon={submitted ? <DescriptionIcon /> : <AddCircleIcon />}
                          sx={{ 
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                            fontWeight: 500,
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {submitted ? "View Submission" : "Submit Payment"}
                        </Button>
                      </CardActions>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
      
      {/* My Submissions Section */}
      <Box 
        mt={6}
        sx={{
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <Box mb={3} display="flex" alignItems="center" justifyContent="center">
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } 
            }}
          >
            My Payment Submissions
          </Typography>
          <Box 
            sx={{ 
              ml: 2, 
              bgcolor: theme.palette.grey[200], 
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {mySubmissions.length}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 4 }} />
        
        {submissionsLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : mySubmissions.length === 0 ? (
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme.palette.grey[50],
              border: `1px dashed ${theme.palette.grey[300]}`,
              height: '200px'
            }}
          >
            <DescriptionIcon fontSize="large" color="disabled" sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              You haven't submitted any payments yet.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3} sx={{ justifyContent: 'flex-start' }}>
            {mySubmissions.map(submission => {
              // Find the related announcement
              const relatedAnnouncement = announcements.find(
                a => a.id === submission.announcement_id
              );
              
              return (
                <Grid item xs={12} sm={6} lg={4} xl={3} key={submission.id}>
                  <Card 
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      height: '100%',
                      border: `1px solid ${theme.palette.grey[200]}`,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
                      },
                      transition: 'box-shadow 0.3s ease-in-out',
                      width: '100%'
                    }}
                  >
                    <Box 
                      sx={{ 
                        bgcolor: (theme) => {
                          switch(submission.status) {
                            case 'verified': return theme.palette.success.main + '08';
                            case 'rejected': return theme.palette.error.main + '08';
                            default: return theme.palette.warning.main + '08';
                          }
                        },
                        px: 3,
                        py: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography 
                        variant="subtitle1" 
                        fontWeight={600}
                        sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: 'calc(100% - 80px)',
                        }}
                      >
                        {relatedAnnouncement?.title || 'Payment'}
                      </Typography>
                      <Chip 
                        icon={getStatusIcon(submission.status)}
                        label={submission.status.toUpperCase()} 
                        color={getStatusColor(submission.status)} 
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Amount Paid
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {submission.amount_paid}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Payment Date
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(submission.payment_date)}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Box mt={2}>
                        <Typography variant="caption" color="textSecondary">
                          Submitted On
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatDate(submission.submitted_at)}
                        </Typography>
                      </Box>
                      
                      {submission.verification_notes && (
                        <>
                          <Divider sx={{ mt: 3, mb: 1 }} />
                          <Box 
                            mt={3}
                            sx={{ 
                              borderRadius: 2,
                              display: 'flex',
                              flexDirection: 'column',
                              width: '100%',
                              minHeight: '150px'
                            }}
                          >
                            <Typography 
                              variant="subtitle2" 
                              color="textSecondary" 
                              display="block" 
                              sx={{ 
                                mb: 1.5,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '0.85rem'
                              }}
                            >
                              {submission.status === 'verified' ? 
                                <CheckCircleIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: theme.palette.success.main }} /> : 
                                submission.status === 'rejected' ?
                                <CancelIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: theme.palette.error.main }} /> :
                                <HourglassEmptyIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: theme.palette.warning.main }} />
                              }
                              Feedback
                            </Typography>
                            <Paper
                              elevation={0}
                              sx={{ 
                                p: 3, 
                                borderRadius: 1.5,
                                bgcolor: submission.status === 'verified' 
                                  ? theme.palette.success.light + '12'
                                  : submission.status === 'rejected'
                                    ? theme.palette.error.light + '12'
                                    : theme.palette.grey[100],
                                border: `1px solid ${
                                  submission.status === 'verified' 
                                    ? theme.palette.success.light 
                                    : submission.status === 'rejected'
                                      ? theme.palette.error.light
                                      : theme.palette.grey[300]
                                }`,
                                backgroundImage: submission.status === 'verified' 
                                  ? 'linear-gradient(45deg, rgba(76, 175, 80, 0.03) 25%, transparent 25%, transparent 50%, rgba(76, 175, 80, 0.03) 50%, rgba(76, 175, 80, 0.03) 75%, transparent 75%, transparent)'
                                  : submission.status === 'rejected'
                                    ? 'linear-gradient(45deg, rgba(244, 67, 54, 0.03) 25%, transparent 25%, transparent 50%, rgba(244, 67, 54, 0.03) 50%, rgba(244, 67, 54, 0.03) 75%, transparent 75%, transparent)'
                                    : 'none',
                                backgroundSize: '20px 20px',
                                maxHeight: '160px',
                                overflowY: 'auto',
                                flex: 1
                              }}
                            >
                              <Typography 
                                variant="body1"
                                sx={{
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.7,
                                  fontSize: '1rem',
                                  fontWeight: 500
                                }}
                              >
                                {submission.verification_notes}
                              </Typography>
                            </Paper>
                          </Box>
                        </>
                      )}
                    </CardContent>
                    
                    <CardActions sx={{ px: 3, pb: 3, pt: submission.verification_notes ? 2 : 0 }}>
                      <Button 
                        variant="outlined" 
                        fullWidth
                        startIcon={<LinkIcon />}
                        href={submission.payment_slip_url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderRadius: 2 }}
                      >
                        View Payment Slip
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Submit Payment Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            p: isMobile ? 1 : 0,
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : '90vh'
          }
        }}
      >
        <DialogTitle sx={{ px: 3, py: 2 }}>
          <Typography variant="h6" component="div" fontWeight={600}>
            Submit Payment for {selectedAnnouncement?.title}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2, overflowY: 'auto' }}>
          <Box mb={3} p={2} bgcolor={theme.palette.grey[50]} borderRadius={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Amount
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedAnnouncement?.amount}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Due Date
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedAnnouncement ? formatDate(selectedAnnouncement.due_date) : ''}
                </Typography>
              </Grid>
            </Grid>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="payment_slip_url"
                label="Payment Slip URL (Google Drive link to your receipt)"
                type="text"
                fullWidth
                value={submissionForm.payment_slip_url}
                onChange={handleFormChange}
                helperText="Upload your payment slip to Google Drive and paste the shareable link here"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                name="amount_paid"
                label="Amount Paid"
                type="text"
                fullWidth
                value={submissionForm.amount_paid}
                onChange={handleFormChange}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Payment Date"
                  value={new Date(submissionForm.payment_date)}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      margin="dense" 
                      fullWidth 
                      sx={{ mb: 2 }}
                      InputProps={{
                        ...params.InputProps,
                        sx: { borderRadius: 2 }
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="notes"
                label="Additional Notes (optional)"
                type="text"
                fullWidth
                multiline
                rows={3}
                value={submissionForm.notes}
                onChange={handleFormChange}
                sx={{ mb: 1 }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'center', gap: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            color="inherit"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            color="primary"
            disabled={!submissionForm.payment_slip_url || !submissionForm.amount_paid}
            sx={{ borderRadius: 2, px: 4 }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Submission Dialog */}
      <Dialog 
        open={openViewDialog} 
        onClose={handleCloseViewDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : '90vh',
            mx: isMobile ? 0 : 2
          }
        }}
      >
        <DialogTitle sx={{ px: 3, py: 2 }}>
          <Typography variant="h6" component="div" fontWeight={600}>
            Payment Submission Details
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
          {selectedSubmission && (
            <Box>
              <Box 
                sx={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  mb: 3
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Status
                </Typography>
                <Chip 
                  icon={getStatusIcon(selectedSubmission.status)}
                  label={selectedSubmission.status.toUpperCase()} 
                  color={getStatusColor(selectedSubmission.status)} 
                  size="medium"
                  sx={{ fontWeight: 600, px: 1 }}
                />
              </Box>
              
              <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: theme.palette.grey[50], borderRadius: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Amount Paid
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedSubmission.amount_paid}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Payment Date
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatDate(selectedSubmission.payment_date)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Submitted On
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatDate(selectedSubmission.submitted_at)}
                      </Typography>
                    </Box>
                  </Grid>
                  {selectedSubmission.verified_at && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Verified On
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatDate(selectedSubmission.verified_at)}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>
              
              {selectedSubmission.notes && (
                <Box mt={3}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Your Notes
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      bgcolor: theme.palette.grey[50] 
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {selectedSubmission.notes}
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              {selectedSubmission.verification_notes && (
                <Box mt={3}>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight={600} 
                    gutterBottom
                    sx={{
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {selectedSubmission.status === 'verified' ? 
                      <CheckCircleIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: theme.palette.success.main }} /> : 
                      selectedSubmission.status === 'rejected' ?
                      <CancelIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: theme.palette.error.main }} /> :
                      <HourglassEmptyIcon sx={{ mr: 0.5, fontSize: '0.9rem', color: theme.palette.warning.main }} />
                    }
                    Verification Notes
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      bgcolor: selectedSubmission.status === 'verified' 
                        ? theme.palette.success.light + '15'
                        : selectedSubmission.status === 'rejected'
                          ? theme.palette.error.light + '15'
                          : theme.palette.grey[50],
                      border: `1px solid ${
                        selectedSubmission.status === 'verified' 
                          ? theme.palette.success.main + '40' 
                          : selectedSubmission.status === 'rejected'
                            ? theme.palette.error.main + '40'
                            : theme.palette.grey[300]
                      }`,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        lineHeight: 1.6,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.95rem'
                      }}
                    >
                      {selectedSubmission.verification_notes}
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              <Box mt={4} display="flex" justifyContent="center">
                <Button 
                  variant="contained" 
                  size="large"
                  color="primary"
                  startIcon={<LinkIcon />}
                  href={selectedSubmission.payment_slip_url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderRadius: 2, px: 4, py: 1.5 }}
                >
                  View Payment Slip
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'center' }}>
          <Button 
            onClick={handleCloseViewDialog} 
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, px: 4 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar 
        open={showMessage} 
        autoHideDuration={6000} 
        onClose={() => setShowMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowMessage(false)} 
          severity={message.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentPayments; 